const http = require('http');
const fs = require('fs');
const path = require('path');
const engine = require('./analytics-engine.js');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Garante escuta pública em produção (VPS, Docker, Cloud, etc.)
const DATA_FILE = path.join(__dirname, 'analytics_data.json');
const EVENTS_LOG_FILE = path.join(__dirname, 'analytics_events.jsonl');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4'
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

// Armazenamento em memória dos eventos
let analyticsEvents = [];

// Carregamento resiliente na inicialização (prioriza log append-only JSONL, com fallback para JSON snapshot)
try {
  if (fs.existsSync(EVENTS_LOG_FILE)) {
    const lines = fs.readFileSync(EVENTS_LOG_FILE, 'utf8').split('\n');
    for (const line of lines) {
      if (!line || !line.trim()) continue;
      try {
        const parsed = JSON.parse(line.trim());
        if (parsed && parsed.event_name) analyticsEvents.push(parsed);
      } catch (err) {}
    }
    console.log(`📦 Carregados ${analyticsEvents.length} eventos do arquivo append-only (${EVENTS_LOG_FILE})`);
  } else if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    analyticsEvents = JSON.parse(raw);
    if (!Array.isArray(analyticsEvents)) analyticsEvents = [];
    console.log(`📦 Carregados ${analyticsEvents.length} eventos do snapshot (${DATA_FILE})`);
  }
} catch (e) {
  console.error('⚠️ Aviso ao carregar histórico de eventos:', e.message);
  analyticsEvents = [];
}

// Persistência segura em disco:
// 1. Imediata em append-only JSONL (atômica e resistente a concorrência de múltiplos visitantes)
// 2. Snapshot atômico periódico em JSON (escreve em .tmp e renomeia)
let snapshotTimeout = null;
function persistEvent(eventObj) {
  // 1. Append imediato não-bloqueante no log JSONL
  try {
    fs.appendFile(EVENTS_LOG_FILE, JSON.stringify(eventObj) + '\n', 'utf8', () => {});
  } catch (err) {}

  // 2. Snapshot atômico com debounce para o painel
  if (snapshotTimeout) clearTimeout(snapshotTimeout);
  snapshotTimeout = setTimeout(() => {
    try {
      const tempPath = `${DATA_FILE}.tmp`;
      fs.writeFile(tempPath, JSON.stringify(analyticsEvents, null, 2), 'utf8', (err) => {
        if (!err) {
          try { fs.renameSync(tempPath, DATA_FILE); } catch (e) {}
        }
      });
    } catch (e) {}
  }, 400);
}

// Cálculo do Funil e Quedas
function computeFunnelReport() {
  const totalSteps = 24;
  const sessionsMap = new Map();

  for (const ev of analyticsEvents) {
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

    if (i < steps.length - 1 && dropCount > maxDropCount) {
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
    total_checkout_clicks: totalCheckoutClicks,
    completion_rate: overallRate,
    biggest_drop_step: biggestDropStep,
    steps: steps,
    device_breakdown: {
      mobile: startedSessions.filter(s => s.device_type === 'mobile').length,
      desktop: startedSessions.filter(s => s.device_type === 'desktop').length
    },
    storage_info: {
      persistent: true,
      log_file: 'analytics_events.jsonl',
      snapshot_file: 'analytics_data.json',
      events_recorded: analyticsEvents.length
    }
  };
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // CORS Headers universais (permite chamadas mesmo se servido de CDN ou subdomínio)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- 1. ROTAS DE API DE RASTREAMENTO & FUNIL ---

  // POST /api/track — Recebe eventos de visitantes reais (fetch / sendBeacon)
  if (pathname === '/api/track' && req.method === 'POST') {
    let body = '';
    let bodySize = 0;
    const MAX_SIZE = 100 * 1024; // Limite de 100KB de segurança

    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const ev = JSON.parse(body);
        if (ev && ev.event_name) {
          const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
          if (clientIp) {
            ev.ip_masked = clientIp.split(',')[0].trim().replace(/\.\d+$/, '.xxx');
          }

          analyticsEvents.push(ev);
          persistEvent(ev);
          await engine.recordEvent(ev);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, event_name: ev.event_name }));
          return;
        }
      } catch (err) {}
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid payload' }));
    });
    return;
  }

  // GET /api/funnel — Retorna o funil calculado e o ponto de maior queda
  if (pathname === '/api/funnel' && req.method === 'GET') {
    const storageData = await engine.getAllEvents();
    const report = engine.computeFunnelReport(storageData.events.length > 0 ? storageData.events : analyticsEvents, storageData);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store'
    });
    res.end(JSON.stringify(report, null, 2));
    return;
  }

  // GET /api/analytics — Retorna lista de eventos recentes
  if (pathname === '/api/analytics' && req.method === 'GET') {
    const storageData = await engine.getAllEvents();
    const evList = storageData.events.length > 0 ? storageData.events : analyticsEvents;
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store'
    });
    res.end(JSON.stringify({
      ok: true,
      total: evList.length,
      backend: storageData.backend,
      is_persistent: storageData.is_persistent,
      events: evList.slice(-200)
    }));
    return;
  }

  // GET /api/analytics/export — Exporta dados completos (CSV ou JSON) para backup
  if (pathname === '/api/analytics/export' && req.method === 'GET') {
    const storageData = await engine.getAllEvents();
    const evList = storageData.events.length > 0 ? storageData.events : analyticsEvents;
    const format = urlObj.searchParams.get('format') || 'json';

    if (format === 'csv') {
      const csv = engine.generateCSV(evList);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=UTF-8',
        'Content-Disposition': 'attachment; filename="quiz_analytics_export.csv"'
      });
      res.end(csv, 'utf-8');
      return;
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Disposition': 'attachment; filename="quiz_analytics_backup.json"'
      });
      res.end(JSON.stringify(evList, null, 2), 'utf-8');
      return;
    }
  }

  // POST /api/analytics/reset — Limpa eventos (útil para reiniciar dados de teste)
  if (pathname === '/api/analytics/reset' && (req.method === 'POST' || req.method === 'GET')) {
    analyticsEvents = [];
    try {
      if (fs.existsSync(EVENTS_LOG_FILE)) fs.unlinkSync(EVENTS_LOG_FILE);
      if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Dados de analytics resetados com sucesso.' }));
    return;
  }

  // GET /analytics — Serve o dashboard visual de funil
  if (pathname === '/analytics' || pathname === '/analytics.html') {
    const dashPath = path.join(__dirname, 'analytics.html');
    fs.readFile(dashPath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Erro ao carregar dashboard de analytics.');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(content);
      }
    });
    return;
  }

  // --- 2. SERVIÇO DE ARQUIVOS ESTÁTICOS & STREAMING DE VÍDEO MP4 ---

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const extname = String(path.extname(filePath)).toLowerCase();

  if (extname === '.mp4') {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        return res.end('<h1>404 Not Found</h1>', 'utf-8');
      }
      const range = req.headers.range;
      if (!range) {
        res.writeHead(200, {
          'Content-Length': stats.size,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes'
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = (end - start) + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4'
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      }
    });
    return;
  }

  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Quiz CaloriasFit rodando em modo produção!`);
  console.log(`👉 Quiz acessível em: http://${HOST}:${PORT}`);
  console.log(`📊 Painel do Funil de Conversão: http://${HOST}:${PORT}/analytics`);
  console.log(`💾 Armazenamento persistente ativo: ${EVENTS_LOG_FILE}\n`);
});
