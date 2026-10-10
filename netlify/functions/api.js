/**
 * netlify/functions/api.js
 * Roteador principal de fallback para Netlify Functions.
 * Delega requisições diretamente para as funções irmãs track.js, funnel.js, analytics.js e export.js.
 */

const trackHandler = require('./track.js').handler;
const funnelHandler = require('./funnel.js').handler;
const analyticsHandler = require('./analytics.js').handler;
const exportHandler = require('./export.js').handler;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const rawPath = event.path || '';
  const cleanPath = rawPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  const method = event.httpMethod;

  // 1. POST /track ou /api/track
  if ((cleanPath === '/track' || cleanPath.endsWith('/track') || rawPath.includes('/track')) && method === 'POST') {
    return trackHandler(event, context);
  }

  // 2. GET /funnel ou /api/funnel
  if ((cleanPath === '/funnel' || cleanPath.endsWith('/funnel') || rawPath.includes('/funnel')) && method === 'GET') {
    return funnelHandler(event, context);
  }

  // 3. GET /export ou /api/analytics/export
  if (cleanPath.includes('/export') || rawPath.includes('/export')) {
    return exportHandler(event, context);
  }

  // 4. GET /analytics ou /api/analytics
  if (cleanPath === '/analytics' || cleanPath === '' || cleanPath === '/' || cleanPath.endsWith('/analytics') || rawPath.includes('/analytics')) {
    return analyticsHandler(event, context);
  }

  return {
    statusCode: 404,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, error: 'Endpoint não encontrado', path: rawPath })
  };
};
