/**
 * analytics-engine.js
 * Motor unificado de rastreamento, cálculo de funil e persistência resiliente.
 * Compatível com Netlify Functions, Node.js (server.js), Upstash Redis e Netlify Blobs.
 */

const fs = require('fs');
const path = require('path');

const STEP_TITLES = {
  1: 'Ten más control sobre tu alimentación y tus calorías',
  2: '¿Cómo percibes tu cuerpo actualmente?',
  3: 'Sensibilidades y factores alimentarios',
  4: 'Mayor dificultad en la rutina alimentaria',
  5: 'Objetivo principal con el control de calorías',
  6: 'Prueba Social y Resultados',
  7: 'Sensación y objetivo deseado',
  8: 'Ritmo del metabolismo',
  9: 'Dificultad para mantener la constancia',
  10: 'Zona donde más te gustaría notar mejoras',
  11: 'Cambios en el metabolismo con los años',
  12: 'Análisis Simulado en Tiempo Real',
  13: 'Resultado / Causa Raíz Identificada',
  14: 'Otras funciones de la aplicación',
  15: 'Qué te impedía hacer seguimiento antes',
  16: 'Rutina de comidas en el día a día',
  17: 'Práctica de actividad física',
  18: 'Por qué el control visual funciona mejor',
  19: 'Adequación de la Solución / 98% de Compatibilidad',
  20: 'Deseo de practicidad visual',
  21: 'Consecuencia de continuar sin seguimiento',
  22: 'Compromiso de menos de 2 minutos al día',
  23: 'Configuración Final del Perfil y Protocolo',
  24: 'Presentación VSL y Oferta Calori AI'
};

// Fallback em memória e arquivos locais
let memoryEvents = [];

function getLocalLogFilePath() {
  // Em ambientes serverless (AWS Lambda / Netlify Functions), apenas /tmp tem permissão de escrita
  const isServerless = Boolean(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    return path.join('/tmp', 'analytics_events.jsonl');
  }
  return path.join(__dirname, 'analytics_events.jsonl');
}

// Carrega eventos locais iniciais se arquivo existir
try {
  const localFile = getLocalLogFilePath();
  if (fs.existsSync(localFile)) {
    const lines = fs.readFileSync(localFile, 'utf8').split('\n');
    for (const l of lines) {
      if (!l || !l.trim()) continue;
      try {
        const parsed = JSON.parse(l.trim());
        if (parsed && parsed.event_name) memoryEvents.push(parsed);
      } catch (e) {}
    }
  }
} catch (e) {}

// --- ADAPTER 1: UPSTASH REDIS (REST API via fetch nativo) ---
function isUpstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function saveToUpstash(ev) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['RPUSH', 'calori_analytics_events', JSON.stringify(ev)],
        ['LTRIM', 'calori_analytics_events', -10000, -1] // Mantém os últimos 10.000 eventos
      ])
    });
    return res.ok;
  } catch (err) {
    console.warn('Erro ao salvar no Upstash Redis:', err.message);
    return false;
  }
}

async function getFromUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/lrange/calori_analytics_events/0/-1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.result)) {
      return data.result.map(item => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }
  } catch (err) {
    console.warn('Erro ao ler do Upstash Redis:', err.message);
  }
  return null;
}

// --- ADAPTER 2: NETLIFY BLOBS (@netlify/blobs) ---
let blobsStoreInstance = null;
function getBlobsStore() {
  if (blobsStoreInstance) return blobsStoreInstance;
  try {
    const { getStore } = require('@netlify/blobs');
    // Em produção no Netlify, getStore sem credenciais manuais usa o contexto da plataforma
    if (process.env.NETLIFY || process.env.CONTEXT || process.env.SITE_ID || process.env.NETLIFY_BLOBS_CONTEXT) {
      blobsStoreInstance = getStore({ name: 'calori-analytics', consistency: 'strong' });
      return blobsStoreInstance;
    }
    // Credenciais manuais opcionais
    if (process.env.NETLIFY_BLOBS_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
      blobsStoreInstance = getStore({
        name: 'calori-analytics',
        siteID: process.env.NETLIFY_BLOBS_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN,
        consistency: 'strong'
      });
      return blobsStoreInstance;
    }
  } catch (err) {}
  return null;
}

async function saveToBlobs(ev) {
  const store = getBlobsStore();
  if (!store) return false;

  try {
    let events = [];
    try {
      const existing = await store.get('events_log', { type: 'json' });
      if (Array.isArray(existing)) events = existing;
    } catch (e) {}

    events.push(ev);
    if (events.length > 10000) events = events.slice(-10000);
    await store.setJSON('events_log', events);
    return true;
  } catch (err) {
    console.warn('Erro ao salvar no Netlify Blobs:', err.message);
    return false;
  }
}

async function getFromBlobs() {
  const store = getBlobsStore();
  if (!store) return null;

  try {
    const existing = await store.get('events_log', { type: 'json' });
    if (Array.isArray(existing)) return existing;
    return [];
  } catch (err) {
    console.warn('Erro ao ler do Netlify Blobs:', err.message);
    return null;
  }
}

// --- GRAVAÇÃO PERSISTENTE UNIFICADA ---
async function recordEvent(ev) {
  if (!ev || !ev.event_name) return { ok: false, error: 'Evento inválido' };

  ev.server_timestamp = new Date().toISOString();

  // Sempre mantém no cache em memória do processo
  memoryEvents.push(ev);
  if (memoryEvents.length > 5000) memoryEvents.shift();

  // Sempre grava em arquivo local /tmp para resiliência imediata
  try {
    const localFile = getLocalLogFilePath();
    fs.appendFileSync(localFile, JSON.stringify(ev) + '\n', 'utf8');
  } catch (e) {}

  let backendUsed = 'memory_local';

  // 1. Prioridade: Upstash Redis (se configurado)
  if (isUpstashConfigured()) {
    const ok = await saveToUpstash(ev);
    if (ok) return { ok: true, backend: 'upstash_redis' };
  }

  // 2. Prioridade: Netlify Blobs (se disponível)
  const blobsOk = await saveToBlobs(ev);
  if (blobsOk) {
    return { ok: true, backend: 'netlify_blobs' };
  }

  return { ok: true, backend: backendUsed };
}

// --- RECUPERAÇÃO DE EVENTOS UNIFICADA ---
async function getAllEvents() {
  // 1. Tenta Upstash Redis
  if (isUpstashConfigured()) {
    const upstashEvents = await getFromUpstash();
    if (upstashEvents !== null) {
      return {
        events: upstashEvents,
        backend: 'upstash_redis',
        is_persistent: true,
        backend_label: 'Upstash Redis (Base de Dados Cloud Persistente)'
      };
    }
  }

  // 2. Tenta Netlify Blobs
  const blobsEvents = await getFromBlobs();
  if (blobsEvents !== null) {
    return {
      events: blobsEvents,
      backend: 'netlify_blobs',
      is_persistent: true,
      backend_label: 'Netlify Blobs (Armazenamento Nativo Netlify)'
    };
  }

  // 3. Fallback: Arquivo local + Memória
  const combined = [...memoryEvents];
  try {
    const localFile = getLocalLogFilePath();
    if (fs.existsSync(localFile)) {
      const lines = fs.readFileSync(localFile, 'utf8').split('\n');
      const set = new Set(combined.map(e => e.session_id + '_' + e.event_name + '_' + (e.timestamp || '')));
      for (const l of lines) {
        if (!l || !l.trim()) continue;
        try {
          const parsed = JSON.parse(l.trim());
          const key = parsed.session_id + '_' + parsed.event_name + '_' + (parsed.timestamp || '');
          if (!set.has(key)) {
            set.add(key);
            combined.push(parsed);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  const isServerless = Boolean(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT);
  return {
    events: combined,
    backend: isServerless ? 'lambda_tmp_memory' : 'local_file',
    is_persistent: !isServerless,
    backend_label: isServerless
      ? 'Memória Temporária do Servidor (Configure Upstash Redis ou Netlify Blobs para persistência entre deploys)'
      : 'Arquivo Local (analytics_events.jsonl)'
  };
}

// --- CÁLCULO ESTRUTURADO DO FUNIL ---
function isTestEvent(ev) {
  if (!ev) return false;
  if (ev.is_test === true || ev.test_mode === true) return true;
  if (ev.session_id && (ev.session_id.startsWith('test_') || ev.session_id.startsWith('test-') || ev.session_id.includes('_test_'))) return true;
  return false;
}

function computeFunnelReport(events, storageMeta = {}, options = {}) {
  const totalSteps = 24;
  const sessionsMap = new Map();

  // Separa eventos de teste dos eventos de visitantes reais
  const realEvents = events.filter(e => !isTestEvent(e));
  const testEvents = events.filter(e => isTestEvent(e));

  // As métricas de visitantes reais calculam apenas com realEvents
  const calculationEvents = (options.include_tests === true) ? events : realEvents;

  for (const ev of calculationEvents) {
    if (!ev || !ev.session_id) continue;
    const sid = ev.session_id;

    if (!sessionsMap.has(sid)) {
      sessionsMap.set(sid, {
        session_id: sid,
        device_type: ev.device_type || 'unknown',
        started: false,
        completed_steps: new Set(),
        max_step_reached: 1,
        is_completed: false,
        checkout_clicked: false,
        last_abandoned_step: null,
        first_seen: ev.timestamp,
        last_seen: ev.timestamp
      });
    }

    const sess = sessionsMap.get(sid);
    if (ev.device_type && (sess.device_type === 'unknown' || !sess.device_type)) {
      sess.device_type = ev.device_type;
    }
    sess.last_seen = ev.timestamp;

    if (ev.event_name === 'quiz_started') {
      sess.started = true;
      sess.max_step_reached = Math.max(sess.max_step_reached, ev.first_step || 1);
    } else if (ev.event_name === 'quiz_step_completed') {
      sess.started = true;
      const sn = parseInt(ev.step_number, 10);
      if (!isNaN(sn)) {
        sess.completed_steps.add(sn);
        sess.max_step_reached = Math.max(sess.max_step_reached, sn + 1);
      }
    } else if (ev.event_name === 'quiz_completed') {
      sess.started = true;
      sess.is_completed = true;
      sess.max_step_reached = Math.max(sess.max_step_reached, totalSteps);
    } else if (ev.event_name === 'quiz_abandoned') {
      const ls = parseInt(ev.last_step, 10);
      if (!isNaN(ls)) {
        sess.last_abandoned_step = ls;
        sess.max_step_reached = Math.max(sess.max_step_reached, ls);
      }
    } else if (ev.event_name === 'quiz_checkout_clicked' || ev.event_name === 'cta_click') {
      sess.checkout_clicked = true;
      sess.is_completed = true;
    }
  }

  const allSessions = Array.from(sessionsMap.values());
  const startedSessions = allSessions.filter(s => s.started || s.max_step_reached >= 1);
  const totalStarted = startedSessions.length;

  const steps = [];
  for (let s = 1; s <= totalSteps; s++) {
    const reached = startedSessions.filter(sess => {
      if (s === 1) return true;
      return sess.completed_steps.has(s - 1) || sess.max_step_reached >= s;
    }).length;

    const completed = startedSessions.filter(sess => sess.completed_steps.has(s)).length;

    const abandoned = startedSessions.filter(sess => {
      if (sess.is_completed) return false;
      if (sess.last_abandoned_step === s) return true;
      return sess.max_step_reached === s && !sess.completed_steps.has(s);
    }).length;

    steps.push({
      step_number: s,
      step_name: STEP_TITLES[s] || `Etapa ${s}`,
      reached_count: reached,
      completed_count: completed,
      abandoned_count: abandoned
    });
  }

  let biggestDropStep = null;
  let maxDropCount = -1;

  for (let i = 0; i < steps.length; i++) {
    const cur = steps[i];
    const next = steps[i + 1];
    const nextReached = next ? next.reached_count : startedSessions.filter(s => s.is_completed).length;

    const dropCount = Math.max(0, cur.reached_count - nextReached);
    const dropRate = cur.reached_count > 0 ? ((dropCount / cur.reached_count) * 100).toFixed(1) : '0.0';
    const advanceRate = cur.reached_count > 0 ? (((cur.reached_count - dropCount) / cur.reached_count) * 100).toFixed(1) : '0.0';

    cur.drop_off_count = dropCount;
    cur.drop_off_rate = dropRate + '%';
    cur.advance_rate = advanceRate + '%';

    if (i < steps.length - 1 && dropCount > maxDropCount && dropCount > 0) {
      maxDropCount = dropCount;
      biggestDropStep = {
        step_number: cur.step_number,
        step_name: cur.step_name,
        drop_count: dropCount,
        drop_rate: dropRate + '%'
      };
    }
  }

  const totalCompleted = startedSessions.filter(s => s.is_completed).length;
  const totalCheckoutClicks = startedSessions.filter(s => s.checkout_clicked).length;
  const overallRate = totalStarted > 0 ? ((totalCompleted / totalStarted) * 100).toFixed(1) + '%' : '0.0%';

  const testSessions = new Set(testEvents.map(e => e.session_id));
  const testSummary = {
    total_test_events: testEvents.length,
    test_sessions_count: testSessions.size,
    has_test_data: testEvents.length > 0
  };

  return {
    total_started: totalStarted,
    total_completed: totalCompleted,
    total_checkout_clicks: totalCheckoutClicks,
    completion_rate: overallRate,
    biggest_drop_step: biggestDropStep,
    steps: steps,
    device_breakdown: {
      mobile: startedSessions.filter(s => s.device_type === 'mobile').length,
      desktop: startedSessions.filter(s => s.device_type === 'desktop').length
    },
    test_summary: testSummary,
    storage_info: {
      persistent: Boolean(storageMeta.is_persistent),
      backend: storageMeta.backend || 'unknown',
      backend_label: storageMeta.backend_label || 'Padrão',
      events_recorded: events.length,
      real_events_count: realEvents.length,
      test_events_count: testEvents.length
    }
  };
}

// --- EXPORTAÇÃO CSV ---
function generateCSV(events) {
  const headers = ['timestamp', 'event_name', 'session_id', 'device_type', 'step_number', 'last_step', 'step_name'];
  const rows = [headers.join(',')];

  for (const ev of events) {
    const row = [
      JSON.stringify(ev.timestamp || ''),
      JSON.stringify(ev.event_name || ''),
      JSON.stringify(ev.session_id || ''),
      JSON.stringify(ev.device_type || ''),
      JSON.stringify(ev.step_number || ''),
      JSON.stringify(ev.last_step || ''),
      JSON.stringify(ev.step_name || ev.last_step_name || '')
    ];
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

module.exports = {
  STEP_TITLES,
  recordEvent,
  getAllEvents,
  computeFunnelReport,
  generateCSV,
  isUpstashConfigured
};
