/**
 * Vercel serverless function for Orange Network APIs MCP Proxy
 * Provides HTTP endpoints for number verification that the backend can call
 *
 * This file is at /api/mcp-proxy.js within the myphoenixphone project root,
 * so Vercel (with Root Directory set to myphoenixphone) creates /api/mcp-proxy.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.orange.com/camara/playground';
const CAMARA_RESOURCE_PREFIX = (process.env.CAMARA_RESOURCE_PREFIX || '/api').replace(/\/$/, '');
const ORANGE_CLIENT_ID = process.env.ORANGE_CLIENT_ID;
const ORANGE_CLIENT_SECRET = process.env.ORANGE_CLIENT_SECRET;

// OAuth token management (per Lambda/container instance)
let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!ORANGE_CLIENT_ID || !ORANGE_CLIENT_SECRET) {
    throw new Error('ORANGE_CLIENT_ID and ORANGE_CLIENT_SECRET are required');
  }

  try {
    const credentials = Buffer.from(`${ORANGE_CLIENT_ID}:${ORANGE_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://api.orange.com/openidconnect/playground/v1.0/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token request failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    const expiresIn = parseInt(tokenData.expires_in) || 3600;
    cachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000 // 60 seconds buffer
    };

    console.log('[MCP Proxy] Successfully obtained access token');
    return tokenData.access_token;
  } catch (error) {
    console.error('[MCP Proxy] Failed to get access token:', error);
    cachedToken = null;
    throw error;
  }
}

async function makeCAMARARequest(endpoint, options = {}) {
  const accessToken = await getAccessToken();
  const url = `${API_BASE_URL}${CAMARA_RESOURCE_PREFIX}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  });
  if (!response.ok) {
    try {
      const copy = response.clone();
      const text = await copy.text().catch(() => '');
      console.error('[MCP Proxy] CAMARA request failed', {
        url,
        status: response.status,
        body: text ? text.slice(0, 500) : undefined,
      });
    } catch (e) {
      console.error('[MCP Proxy] CAMARA request failed (no body to log)', {
        url,
        status: response.status,
        error: e?.message,
      });
    }
  }
  return response;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { query } = req;
  const rawPath = query.path;
  let path = '';
  if (Array.isArray(rawPath)) {
    path = rawPath.join('/');
  } else if (typeof rawPath === 'string') {
    try {
      path = decodeURIComponent(rawPath);
    } catch (_) {
      path = rawPath;
    }
  }

  // Health check - /api/mcp-proxy or /api/mcp-proxy?path=health
  if (!path || path === 'health') {
    res.status(200).json({
      status: 'ok',
      service: 'mcp-proxy',
      endpoint: '/api/mcp-proxy',
      hasOrangeCreds: Boolean(ORANGE_CLIENT_ID && ORANGE_CLIENT_SECRET),
      usage: 'Use ?path=number-verification/v0.3/verify-with-code/send-code for verification'
    });
    return;
  }

  // Number verification: send code
  if (path === 'number-verification/v0.3/verify-with-code/send-code' && req.method === 'POST') {
    try {
      const requestData = req.body;
      const response = await makeCAMARARequest('/number-verification/v0.3/verify-with-code/send-code', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      const verificationCode = response.headers.get('X-Verification-Code');

      if (response.ok) {
        if (verificationCode) {
          res.setHeader('X-Verification-Code', verificationCode);
        }
        if (response.status === 204) {
          res.status(204).end();
        } else {
          const responseText = await response.text();
          res.status(response.status).send(responseText);
        }
      } else {
        const errorText = await response.text();
        res.status(response.status).send(errorText);
      }
    } catch (error) {
      console.error('[MCP Proxy] Error sending verification code:', error);
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // Number verification: verify code
  if (path === 'number-verification/v0.3/verify-with-code/verify' && req.method === 'POST') {
    try {
      const requestData = req.body;
      const response = await makeCAMARARequest('/number-verification/v0.3/verify-with-code/verify', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();
      res.status(response.status).send(responseText);
    } catch (error) {
      console.error('[MCP Proxy] Error verifying code:', error);
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // 404 for unknown routes
  res.status(404).json({ error: 'Not Found', path, method: req.method });
};
