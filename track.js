/**
 * netlify/functions/track.js
 * Função Serverless da Netlify para registrar eventos do Quiz no Upstash Redis.
 * 100% autônoma, sem dependências externas de pacotes ou arquivos locais.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

exports.handler = async (event) => {
  // Tratamento de preflight CORS (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  try {
    let bodyText = event.body || '';
    if (event.isBase64Encoded) {
      try {
        bodyText = Buffer.from(bodyText, 'base64').toString('utf8');
      } catch (e) {}
    }

    const payload = bodyText ? JSON.parse(bodyText) : null;
    if (!payload || !payload.event_name) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Invalid payload: event_name is required' })
      };
    }

    // Adiciona timestamp do servidor
    payload.server_timestamp = new Date().toISOString();

    // Mascara IP do cliente para conformidade com privacidade / LGPD
    const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || '';
    if (clientIp) {
      payload.ip_masked = clientIp.split(',')[0].trim().replace(/\.\d+$/, '.xxx');
    }

    // Lê credenciais exclusivamente das variáveis de ambiente da Netlify
    const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
    const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!rawUrl || !rawToken) {
      console.warn('⚠️ [track.js] Variáveis UPSTASH_REDIS_REST_URL e/ou UPSTASH_REDIS_REST_TOKEN não configuradas no Netlify.');
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          warning: 'Upstash environment variables not configured on Netlify',
          event_name: payload.event_name
        })
      };
    }

    const url = rawUrl.trim().replace(/\/+$/, '');
    const token = rawToken.trim();

    // Envia o evento diretamente para o Upstash Redis via REST API (pipeline com RPUSH + LTRIM)
    const redisRes = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['RPUSH', 'calori_analytics_events', JSON.stringify(payload)],
        ['LTRIM', 'calori_analytics_events', -10000, -1] // Mantém os últimos 10.000 eventos persistidos
      ])
    });

    if (!redisRes.ok) {
      const errText = await redisRes.text();
      console.error(`❌ [track.js] Erro ao gravar no Upstash Redis (HTTP ${redisRes.status}):`, errText);
      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: `Upstash returned HTTP ${redisRes.status}` })
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        event_name: payload.event_name,
        backend: 'upstash_redis'
      })
    };
  } catch (err) {
    console.error('❌ [track.js] Erro inesperado:', err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
