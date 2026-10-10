/**
 * netlify/functions/analytics.js
 * Handler direto para GET /.netlify/functions/analytics e /api/analytics
 * Retorna os últimos eventos recebidos para a stream em tempo real.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!rawUrl || !rawToken) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ ok: true, total: 0, backend: 'not_configured', events: [] })
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

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        ok: true,
        total: events.length,
        backend: 'upstash_redis',
        is_persistent: true,
        events: events.slice(-200)
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
