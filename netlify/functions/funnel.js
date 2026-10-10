/**
 * netlify/functions/funnel.js
 * Função Serverless da Netlify para consultar eventos no Upstash Redis e calcular o funil completo de 24 etapas.
 * 100% autônoma, sem dependências de pacotes externos ou arquivos locais.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

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

function isTestEvent(ev) {
  if (!ev) return false;
  if (ev.is_test === true || ev.test_mode === true) return true;
  if (ev.session_id && (ev.session_id.startsWith('test_') || ev.session_id.startsWith('test-') || ev.session_id.includes('_test_'))) return true;
  return false;
}

function computeFunnelReport(events = []) {
  const totalSteps = 24;
  const sessionsMap = new Map();

  // Filtra eventos de teste para não contaminar métricas de visitantes reais
  const realEvents = events.filter(e => !isTestEvent(e));
  const testEvents = events.filter(e => isTestEvent(e));

  for (const ev of realEvents) {
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

  return {
    total_started: totalStarted,
    total_completed: totalCompleted,
    completion_rate: overallRate,
    total_checkout_clicks: totalCheckoutClicks,
    biggest_drop_step: biggestDropStep,
    steps,
    test_summary: {
      total_test_events: testEvents.length,
      total_test_sessions: new Set(testEvents.map(e => e.session_id)).size
    },
    storage_info: {
      backend: 'upstash_redis',
      backend_label: 'Upstash Redis (Base de Dados Cloud Persistente)',
      persistent: true
    }
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!rawUrl || !rawToken) {
    console.warn('⚠️ [funnel.js] UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN ausente.');
    const emptyReport = computeFunnelReport([]);
    emptyReport.storage_info = {
      backend: 'not_configured',
      backend_label: 'Upstash Redis não configurado no Netlify (Defina as variáveis no painel da Netlify)',
      persistent: false
    };
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(emptyReport, null, 2)
    };
  }

  const url = rawUrl.trim().replace(/\/+$/, '');
  const token = rawToken.trim();

  try {
    const res = await fetch(`${url}/lrange/calori_analytics_events/0/-1`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Upstash returned HTTP ${res.status}`);
    }

    const data = await res.json();
    let events = [];
    if (Array.isArray(data.result)) {
      events = data.result.map(item => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }

    const report = computeFunnelReport(events);

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(report, null, 2)
    };
  } catch (err) {
    console.error('❌ [funnel.js] Erro:', err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
