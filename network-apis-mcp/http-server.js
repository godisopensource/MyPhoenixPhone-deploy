#!/usr/bin/env node
/**
 * HTTP wrapper for the Orange Network APIs MCP Server
 * Exposes number verification endpoints that the backend can call
 */

import http from 'http';

const PORT = process.env.PORT || 3001;
// Orange CAMARA playground base URL for legacy paths (if any)
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.orange.com/orange-lab/camara/playground';
// Direct FR playground verify endpoint base (CAMARA OFR 1.0 style)
const FR_VERIFY_BASE = process.env.FR_VERIFY_BASE || 'https://api.orange.com/camara/ofr/number-verification/v1';
// When true, we bridge verify-with-code flow to FR verify endpoint (playground)
const PLAYGROUND_BRIDGE = (process.env.PLAYGROUND_BRIDGE || 'true').toLowerCase() === 'true';
const ORANGE_CLIENT_ID = process.env.ORANGE_CLIENT_ID;
const ORANGE_CLIENT_SECRET = process.env.ORANGE_CLIENT_SECRET;

if (!ORANGE_CLIENT_ID || !ORANGE_CLIENT_SECRET) {
  console.error('❌ ORANGE_CLIENT_ID and ORANGE_CLIENT_SECRET are required');
  process.exit(1);
}

// OAuth token management
let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
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
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[MCP Proxy] Calling CAMARA API: ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  });

  console.log(`[MCP Proxy] CAMARA response: ${response.status} ${response.statusText}`);
  
  return response;
}

async function callFRVerify(phoneNumber) {
  const accessToken = await getAccessToken();
  const url = `${FR_VERIFY_BASE}/verify`;
  console.log(`[MCP Proxy] Calling FR playground verify: ${url} with phoneNumber ${phoneNumber}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ phoneNumber }),
  });
  console.log(`[MCP Proxy] FR verify response: ${res.status} ${res.statusText}`);
  return res;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL to support both direct paths and query param format
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathFromQuery = url.searchParams.get('path');
  let actualPath = pathFromQuery || url.pathname;
  
  // Normalize path to always start with /
  if (actualPath && !actualPath.startsWith('/')) {
    actualPath = '/' + actualPath;
  }

  console.log(`[MCP Proxy] ${req.method} ${req.url}`);
  console.log(`[MCP Proxy] pathFromQuery: ${pathFromQuery}`);
  console.log(`[MCP Proxy] url.pathname: ${url.pathname}`);
  console.log(`[MCP Proxy] actualPath: ${actualPath}`);

  // Health check
  if (actualPath === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'mcp-proxy' }));
    return;
  }

  // Number verification: send code
  if (actualPath === '/number-verification/v0.3/verify-with-code/send-code' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const requestData = JSON.parse(body);

      if (PLAYGROUND_BRIDGE) {
        // Bridge mode: simulate send-code success and optionally provide a demo code header
        const demoCode = '000000';
        console.log(`[MCP Proxy] Bridge send-code (playground): returning 204 with X-Verification-Code=${demoCode}`);
        res.writeHead(204, { 'X-Verification-Code': demoCode });
        res.end();
        return;
      }

      const response = await makeCAMARARequest('/number-verification/v0.3/verify-with-code/send-code', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      // In playground, the code might be in response headers
      const verificationCode = response.headers.get('X-Verification-Code');
      
      if (response.ok) {
        res.writeHead(response.status, { 
          'Content-Type': 'application/json',
          ...(verificationCode && { 'X-Verification-Code': verificationCode })
        });
        
        // 204 No Content expected from CAMARA
        if (response.status === 204) {
          res.end();
        } else {
          const responseText = await response.text();
          res.end(responseText);
        }
      } else {
        const errorText = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(errorText);
      }
    } catch (error) {
      console.error('[MCP Proxy] Error sending verification code:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Number verification: verify code
  if (actualPath === '/number-verification/v0.3/verify-with-code/verify' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const requestData = JSON.parse(body);

      if (PLAYGROUND_BRIDGE) {
        // Ignore code and call FR playground verify endpoint with phoneNumber
        const { phoneNumber } = requestData || {};
        if (!phoneNumber) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'phoneNumber is required' }));
          return;
        }
        const frRes = await callFRVerify(phoneNumber);
        const txt = await frRes.text();
        res.writeHead(frRes.status, { 'Content-Type': 'application/json' });
        res.end(txt);
        return;
      }

      const response = await makeCAMARARequest('/number-verification/v0.3/verify-with-code/verify', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(responseText);
    } catch (error) {
      console.error('[MCP Proxy] Error verifying code:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 404 for unknown routes
  console.log(`[MCP Proxy] 404 - No route matched for: ${actualPath}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', path: actualPath, method: req.method }));
});

server.listen(PORT, () => {
  console.log(`🚀 MCP Proxy HTTP server listening on port ${PORT}`);
  console.log(`📡 CAMARA API base: ${API_BASE_URL}`);
  console.log(`✅ Ready to proxy number verification requests`);
});
