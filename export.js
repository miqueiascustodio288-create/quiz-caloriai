/**
 * netlify/functions/export.js
 * Handler direto para GET /.netlify/functions/export e /api/analytics/export
 * Gera exportação CSV ou JSON dos eventos salvos no Upstash Redis.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With'
};

function isTestEvent(ev) {
  if (!ev) return false;
  if (ev.is_test === true || ev.test_mode === true) return true;
  if (ev.session_id && (ev.session_id.startsWith('test_') || ev.session_id.startsWith('test-') || ev.session_id.includes('_test_'))) return true;
  return false;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  let events = [];
  if (rawUrl && rawToken) {
    try {
      const url = rawUrl.trim().replace(/\/+$/, '');
      const token = rawToken.trim();
      const res = await fetch(`${url}/lrange/calori_analytics_events/0/-1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.result)) {
          events = data.result.map(item => {
            try {
              return typeof item === 'string' ? JSON.parse(item) : item;
            } catch (e) {
              return null;
            }
          }).filter(Boolean);
        }
      }
    } catch (e) {}
  }

  const format = (event.queryStringParameters && event.queryStringParameters.format) || 'csv';
  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Disposition': `attachment; filename="analytics_events_${dateStr}.json"`
      },
      body: JSON.stringify(events, null, 2)
    };
  }

  // Geração de CSV
  const headers = ['timestamp', 'event_name', 'session_id', 'step_number', 'step_name', 'last_step', 'device_type', 'is_test'];
  const csvRows = [headers.join(',')];

  for (const ev of events) {
    const row = [
      JSON.stringify(ev.timestamp || ''),
      JSON.stringify(ev.event_name || ev.event || ''),
      JSON.stringify(ev.session_id || ''),
      JSON.stringify(ev.step_number || ''),
      JSON.stringify(ev.step_name || ''),
      JSON.stringify(ev.last_step || ''),
      JSON.stringify(ev.device_type || ''),
      JSON.stringify(isTestEvent(ev) ? 'true' : 'false')
    ];
    csvRows.push(row.join(','));
  }

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/csv; charset=UTF-8',
      'Content-Disposition': `attachment; filename="relatorio_funil_${dateStr}.csv"`
    },
    body: csvRows.join('\n')
  };
};
