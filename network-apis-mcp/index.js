#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ResourceTemplate, McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import http from "http";
const config$2 = {
  api: {
    baseUrl: process.env.API_BASE_URL || "https://api.orange.com/camara/playground",
    clientId: process.env.ORANGE_CLIENT_ID,
    clientSecret: process.env.ORANGE_CLIENT_SECRET,
    timeout: parseInt(process.env.API_TIMEOUT || "30000", 10),
    retries: parseInt(process.env.API_RETRIES || "3", 10),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Accept": "application/json",
      "User-Agent": `orange-roaming-mcp-server/${process.env.MCP_SERVER_VERSION || "1.0.0"}`
    }
  }
};
if (!config$2.api.clientId || !config$2.api.clientSecret) {
  throw new Error("Client ID and Client Secret are required for OAuth");
}
const registerPrompts = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerPrompt(
    "echo",
    {
      title: "Echo Prompt",
      description: "Creates a prompt to process a message",
      argsSchema: { message: z.string() }
    },
    ({ message }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please process this message: ${message}`
          }
        }
      ]
    })
  );
}, "registerPrompts");
const config$1 = config$2.api;
let cachedToken;
const getAccessToken = /* @__PURE__ */ __name(async () => {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  try {
    const credentials = Buffer.from(`${config$1.clientId}:${config$1.clientSecret}`).toString("base64");
    const response = await fetch("https://api.orange.com/openidconnect/playground/v1.0/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(config$1.timeout)
    });
    if (!response.ok) {
      const errorText = await response.text();
      cachedToken = void 0;
      throw new Error(`OAuth token request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const tokenData = await response.json();
    const expiresIn = parseInt(tokenData.expires_in) || 3600;
    cachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1e3
      // 60 seconds buffer
    };
    console.error("[API Client] Successfully obtained access token");
    return tokenData.access_token;
  } catch (error) {
    console.error("[API Client] Failed to get access token:", error);
    cachedToken = void 0;
    throw new Error(`Failed to obtain access token: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "getAccessToken");
const makeRequest = /* @__PURE__ */ __name(async (endpoint, options = {}) => {
  const url = `${config$1.baseUrl}/api${endpoint}`;
  let lastError = null;
  for (let attempt = 1; attempt <= config$1.retries; attempt++) {
    try {
      const accessToken = await getAccessToken();
      const requestOptions = {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "orange-playground-mcp-server",
          ...options.headers
        },
        signal: AbortSignal.timeout(config$1.timeout)
      };
      console.error(`[API Client] Making request to ${url} (attempt ${attempt}/${config$1.retries})`);
      const response = await fetch(url, requestOptions);
      if (response.ok || response.status >= 400 && response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.error(`[API Client] Request failed (attempt ${attempt}/config.retries}):`, lastError.message);
    }
    if (attempt < config$1.retries) {
      const delay = Math.min(1e3 * Math.pow(2, attempt - 1), 5e3);
      console.error(`[API Client] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error(`Request failed after ${config$1.retries} retries`);
}, "makeRequest");
const getDeviceLocation = /* @__PURE__ */ __name(async (phoneNumber, maxAge) => {
  try {
    const request = {
      device: { phoneNumber }
    };
    if (maxAge !== void 0) {
      request.maxAge = maxAge;
    }
    const response = await makeRequest("/location-retrieval/v0.3/retrieve", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const location = await response.json();
    return location;
  } catch (error) {
    console.error("[API Client] Failed to get device location:", error);
    throw new Error(`Failed to get device location: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "getDeviceLocation");
const registerResources$5 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerResource(
    "device-location-retrieval",
    new ResourceTemplate("device-location-retrieval://{phoneNumber}", { list: void 0 }),
    {
      title: "Device Location Retrieval",
      description: "Get the geographical location (area) where a phone number is localized"
    },
    async (uri, { phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        const location = await getDeviceLocation(phoneNumber);
        console.error("[location]", JSON.stringify(location));
        let areaDescription = "";
        if (location.area.areaType === "CIRCLE") {
          const circle = location.area;
          areaDescription = `Circle: center (${circle.center.latitude}, ${circle.center.longitude}), radius ${circle.radius}m`;
        } else if (location.area.areaType === "POLYGON") {
          const polygon = location.area;
          areaDescription = `Polygon: ${polygon.boundary.length} points, boundary: ${polygon.boundary.map((p) => `(${p.latitude}, ${p.longitude})`).join(", ")}`;
        }
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  location: {
                    lastLocationTime: location.lastLocationTime,
                    areaType: location.area.areaType,
                    areaDescription,
                    area: location.area
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
  mcpServer2.registerResource(
    "device-location-retrieval-with-maxage",
    new ResourceTemplate("device-location-retrieval://{phoneNumber}/maxAge/{maxAge}", { list: void 0 }),
    {
      title: "Device Location Retrieval with MaxAge",
      description: "Get phone number location with specific maximum age requirement (in seconds)"
    },
    async (uri, { phoneNumber, maxAge }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!maxAge || typeof maxAge !== "string") {
          throw new Error("MaxAge parameter is required and must be a string representing seconds");
        }
        const maxAgeNumber = parseInt(maxAge, 10);
        if (isNaN(maxAgeNumber) || maxAgeNumber < 0) {
          throw new Error("MaxAge must be a non-negative integer representing seconds");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        const location = await getDeviceLocation(phoneNumber, maxAgeNumber);
        console.error("[location-maxage]", JSON.stringify({ phoneNumber, maxAge: maxAgeNumber, location }));
        let areaDescription = "";
        if (location.area.areaType === "CIRCLE") {
          const circle = location.area;
          areaDescription = `Circle: center (${circle.center.latitude}, ${circle.center.longitude}), radius ${circle.radius}m`;
        } else if (location.area.areaType === "POLYGON") {
          const polygon = location.area;
          areaDescription = `Polygon: ${polygon.boundary.length} points, boundary: ${polygon.boundary.map((p) => `(${p.latitude}, ${p.longitude})`).join(", ")}`;
        }
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  maxAge: maxAgeNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  location: {
                    lastLocationTime: location.lastLocationTime,
                    areaType: location.area.areaType,
                    areaDescription,
                    area: location.area
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  maxAge,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
}, "registerResources$5");
const verifyDeviceLocation = /* @__PURE__ */ __name(async (phoneNumber, area, maxAge) => {
  try {
    const request = {
      device: { phoneNumber },
      area
    };
    if (maxAge !== void 0) {
      request.maxAge = maxAge;
    }
    const response = await makeRequest("/location-verification/v1/verify", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const verification = await response.json();
    return verification;
  } catch (error) {
    console.error("[API Client] Failed to verify device location:", error);
    throw new Error(`Failed to verify device location: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "verifyDeviceLocation");
const registerResources$4 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerResource(
    "device-location-verification",
    new ResourceTemplate(
      "device-location-verification://{phoneNumber}/lat/{latitude}/lng/{longitude}/radius/{radius}",
      { list: void 0 }
    ),
    {
      title: "Device Location Verification",
      description: "Verify if a phone number is within a circular area (latitude, longitude, radius in meters)"
    },
    async (uri, { phoneNumber, latitude, longitude, radius }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        if (!latitude || !longitude || !radius) {
          throw new Error("Latitude, longitude, and radius parameters are required");
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseInt(radius, 10);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error("Invalid latitude. Must be a number between -90 and 90");
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error("Invalid longitude. Must be a number between -180 and 180");
        }
        if (isNaN(rad) || rad < 2e3 || rad > 2e5) {
          throw new Error("Invalid radius. Must be a number between 2000 and 200000 meters");
        }
        const area = {
          areaType: "CIRCLE",
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: rad
        };
        const verification = await verifyDeviceLocation(phoneNumber, area);
        console.error("[verification]", JSON.stringify(verification));
        let resultDescription = "";
        switch (verification.verificationResult) {
          case "TRUE":
            resultDescription = "Device is within the requested area";
            break;
          case "FALSE":
            resultDescription = "Device is NOT within the requested area";
            break;
          case "PARTIAL":
            resultDescription = `Device partially matches the area (${verification.matchRate}% match rate)`;
            break;
          case "UNKNOWN":
            resultDescription = "Unable to locate the device";
            break;
          default:
            resultDescription = "Unknown verification result";
        }
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  area: {
                    latitude: lat,
                    longitude: lng,
                    radius: rad
                  },
                  verification: {
                    result: verification.verificationResult,
                    resultDescription,
                    matchRate: verification.matchRate,
                    lastLocationTime: verification.lastLocationTime
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
  mcpServer2.registerResource(
    "device-location-verification-with-maxage",
    new ResourceTemplate(
      "device-location-verification://{phoneNumber}/lat/{latitude}/lng/{longitude}/radius/{radius}/maxAge/{maxAge}",
      { list: void 0 }
    ),
    {
      title: "Device Location Verification with MaxAge",
      description: "Verify device location with specific maximum age requirement (in seconds)"
    },
    async (uri, { phoneNumber, latitude, longitude, radius, maxAge }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        if (!latitude || !longitude || !radius || !maxAge) {
          throw new Error("Latitude, longitude, radius, and maxAge parameters are required");
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseInt(radius, 10);
        const maxAgeNumber = parseInt(maxAge, 10);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error("Invalid latitude. Must be a number between -90 and 90");
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error("Invalid longitude. Must be a number between -180 and 180");
        }
        if (isNaN(rad) || rad < 2e3 || rad > 2e5) {
          throw new Error("Invalid radius. Must be a number between 2000 and 200000 meters");
        }
        if (isNaN(maxAgeNumber) || maxAgeNumber < 0) {
          throw new Error("MaxAge must be a non-negative integer representing seconds");
        }
        const area = {
          areaType: "CIRCLE",
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: rad
        };
        const verification = await verifyDeviceLocation(phoneNumber, area, maxAgeNumber);
        console.error(
          "[verification-maxage]",
          JSON.stringify({ phoneNumber, area, maxAge: maxAgeNumber, verification })
        );
        let resultDescription = "";
        switch (verification.verificationResult) {
          case "TRUE":
            resultDescription = "Device is within the requested area";
            break;
          case "FALSE":
            resultDescription = "Device is NOT within the requested area";
            break;
          case "PARTIAL":
            resultDescription = `Device partially matches the area (${verification.matchRate}% match rate)`;
            break;
          case "UNKNOWN":
            resultDescription = "Unable to locate the device";
            break;
          default:
            resultDescription = "Unknown verification result";
        }
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  area: {
                    latitude: lat,
                    longitude: lng,
                    radius: rad
                  },
                  maxAge: maxAgeNumber,
                  verification: {
                    result: verification.verificationResult,
                    resultDescription,
                    matchRate: verification.matchRate,
                    lastLocationTime: verification.lastLocationTime
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  latitude,
                  longitude,
                  radius,
                  maxAge,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
}, "registerResources$4");
const getDeviceReachabilityStatus = /* @__PURE__ */ __name(async (phoneNumber) => {
  try {
    const request = {
      device: { phoneNumber }
    };
    const response = await makeRequest("/device-reachability-status/v0.6/retrieve", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const reachabilityStatus = await response.json();
    return reachabilityStatus;
  } catch (error) {
    console.error("[API Client] Failed to get reachability status:", error);
    throw new Error(`Failed to get reachability status: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "getDeviceReachabilityStatus");
const registerResources$3 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerResource(
    "device-reachability-status",
    new ResourceTemplate("device-reachability-status://{phoneNumber}", { list: void 0 }),
    {
      title: "Device Reachability Status",
      description: "Get the current reachability status (CONNECTED_DATA, CONNECTED_SMS, NOT_CONNECTED) for a phone number"
    },
    async (uri, { phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        const reachabilityStatus = await getDeviceReachabilityStatus(phoneNumber);
        console.error("[reachability]", JSON.stringify(reachabilityStatus));
        let statusDescription = "";
        switch (reachabilityStatus.reachabilityStatus) {
          case "CONNECTED_DATA":
            statusDescription = "Connected via data (can receive SMS and data)";
            break;
          case "CONNECTED_SMS":
            statusDescription = "Connected via SMS only (no data connection)";
            break;
          case "NOT_CONNECTED":
            statusDescription = "Not connected to the network";
            break;
          default:
            statusDescription = "Unknown status";
        }
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  reachability: {
                    status: reachabilityStatus.reachabilityStatus,
                    statusDescription,
                    lastStatusTime: reachabilityStatus.lastStatusTime
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
}, "registerResources$3");
const getDeviceRoamingStatus = /* @__PURE__ */ __name(async (phoneNumber) => {
  try {
    const request = { device: { phoneNumber } };
    const response = await makeRequest("/device-roaming-status/v0.6/retrieve", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const roamingStatus = await response.json();
    return roamingStatus;
  } catch (error) {
    console.error("[API Client] Failed to get roaming status:", error);
    throw new Error(`Failed to get roaming status: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "getDeviceRoamingStatus");
const registerResources$2 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerResource(
    "device-roaming-status",
    new ResourceTemplate("device-roaming-status://{phoneNumber}", { list: void 0 }),
    {
      title: "Device Roaming Status",
      description: "Get roaming status and country information (only if roaming) for a specific phone number"
    },
    async (uri, { phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        const status = await getDeviceRoamingStatus(phoneNumber);
        console.error("[roaming]", JSON.stringify(status));
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  ...status
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
}, "registerResources$2");
const getSimSwapDate = /* @__PURE__ */ __name(async (phoneNumber) => {
  try {
    const request = {
      phoneNumber
    };
    const response = await makeRequest("/sim-swap/v1/retrieve-date", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const simSwapInfo = await response.json();
    return simSwapInfo;
  } catch (error) {
    console.error("[API Client] Failed to get SIM swap date:", error);
    throw new Error(`Failed to get SIM swap date: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "getSimSwapDate");
const checkSimSwap = /* @__PURE__ */ __name(async (phoneNumber, maxAge) => {
  try {
    const request = {
      phoneNumber
    };
    if (maxAge !== void 0) {
      request.maxAge = maxAge;
    }
    const response = await makeRequest("/sim-swap/v1/check", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const simSwapCheck = await response.json();
    return simSwapCheck;
  } catch (error) {
    console.error("[API Client] Failed to check SIM swap:", error);
    throw new Error(`Failed to check SIM swap: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "checkSimSwap");
const registerResources$1 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerResource(
    "sim-swap-date",
    new ResourceTemplate("sim-swap-date://{phoneNumber}", { list: void 0 }),
    {
      title: "SIM Swap Date",
      description: "Get the timestamp of the latest SIM swap event for a phone number"
    },
    async (uri, { phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        const simSwapInfo = await getSimSwapDate(phoneNumber);
        console.error("[sim-swap-date]", JSON.stringify(simSwapInfo));
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  simSwap: {
                    latestSimChange: simSwapInfo.latestSimChange,
                    hasSimSwap: simSwapInfo.latestSimChange !== null
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
  mcpServer2.registerResource(
    "sim-swap-check",
    new ResourceTemplate("sim-swap-check://{phoneNumber}/{hours}", { list: void 0 }),
    {
      title: "SIM Swap Check",
      description: "Check if a SIM swap occurred in the last X hours for a phone number (e.g., sim-swap-check://+33699901032/24)"
    },
    async (uri, { phoneNumber, hours }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        if (!hours || typeof hours !== "string") {
          throw new Error("Hours parameter is required and must be a string representing hours");
        }
        const hoursNumber = parseInt(hours, 10);
        if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 2400) {
          throw new Error("Hours must be an integer between 1 and 2400 hours");
        }
        const simSwapCheck = await checkSimSwap(phoneNumber, hoursNumber);
        console.error("[sim-swap-check]", JSON.stringify({ phoneNumber, hours: hoursNumber, simSwapCheck }));
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  simSwapCheck: {
                    swapped: simSwapCheck.swapped,
                    hours: hoursNumber,
                    description: simSwapCheck.swapped ? `SIM swap detected in the last ${hoursNumber} hours` : `No SIM swap detected in the last ${hoursNumber} hours`
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  hours,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
  mcpServer2.registerResource(
    "sim-swap-check-default",
    new ResourceTemplate("sim-swap-check-default://{phoneNumber}", { list: void 0 }),
    {
      title: "SIM Swap Check (Default 48h)",
      description: "Check if a SIM swap occurred in the last 48 hours (2 days) for a phone number"
    },
    async (uri, { phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          throw new Error("Phone number parameter is required and must be a string");
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          throw new Error("Invalid phone number format. Use E.164 format (e.g., +33699901032)");
        }
        const defaultHours = 48;
        const simSwapCheck = await checkSimSwap(phoneNumber, defaultHours);
        console.error("[sim-swap-check-default]", JSON.stringify({ phoneNumber, hours: defaultHours, simSwapCheck }));
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  simSwapCheck: {
                    swapped: simSwapCheck.swapped,
                    hours: defaultHours,
                    description: simSwapCheck.swapped ? `SIM swap detected in the last ${defaultHours} hours` : `No SIM swap detected in the last ${defaultHours} hours`
                  }
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : "Unknown error",
                  phoneNumber,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                },
                null,
                2
              ),
              mimeType: "application/json"
            }
          ]
        };
      }
    }
  );
}, "registerResources$1");
const registerResources = /* @__PURE__ */ __name((mcpServer2) => {
  registerResources$2(mcpServer2);
  registerResources$5(mcpServer2);
  registerResources$4(mcpServer2);
  registerResources$3(mcpServer2);
  registerResources$1(mcpServer2);
}, "registerResources");
const registerTools$8 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "get-device-location",
    {
      title: "Get device location",
      description: "Retrieve the geographical location (area) where a device is currently localized",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33699901032)"),
        maxAge: z.number().optional().describe("Maximum age of location data in seconds (optional)")
      }
    },
    async ({ phoneNumber, maxAge }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33699901032)" }],
            isError: true
          };
        }
        if (maxAge !== void 0 && (maxAge < 0 || !Number.isInteger(maxAge))) {
          return {
            content: [{ type: "text", text: "❌ MaxAge must be a non-negative integer representing seconds" }],
            isError: true
          };
        }
        const location = await getDeviceLocation(phoneNumber, maxAge);
        let response = `📍 **Device Location for ${phoneNumber}**

`;
        if (maxAge !== void 0) {
          response += `⏱️ **Max Age Requested**: ${maxAge} seconds
`;
        }
        response += `🕒 **Last Location Time**: ${location.lastLocationTime}

`;
        if (location.area.areaType === "CIRCLE") {
          const circle = location.area;
          response += `🔵 **Area Type**: Circle
`;
          response += `📍 **Center**: ${circle.center.latitude}, ${circle.center.longitude}
`;
          response += `📏 **Radius**: ${circle.radius} meters
`;
        } else if (location.area.areaType === "POLYGON") {
          const polygon = location.area;
          response += `🔷 **Area Type**: Polygon
`;
          response += `📍 **Boundary Points** (${polygon.boundary.length} points):
`;
          polygon.boundary.forEach((point, index) => {
            response += `  ${index + 1}. ${point.latitude}, ${point.longitude}
`;
          });
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] get-device-location error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get device location: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$8");
const registerTools$7 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "verify-device-location",
    {
      title: "Verify device location",
      description: "Verify if a device is within a specified circular area",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33699901032)"),
        latitude: z.number().describe("Latitude of the center point (-90 to 90)"),
        longitude: z.number().describe("Longitude of the center point (-180 to 180)"),
        radius: z.number().describe("Radius in meters (2000 to 200000)"),
        maxAge: z.number().optional().describe("Maximum age of location data in seconds (optional)")
      }
    },
    async ({ phoneNumber, latitude, longitude, radius, maxAge }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33699901032)" }],
            isError: true
          };
        }
        if (latitude === void 0 || typeof latitude !== "number" || latitude < -90 || latitude > 90) {
          return {
            content: [{ type: "text", text: "❌ Invalid latitude. Must be a number between -90 and 90" }],
            isError: true
          };
        }
        if (longitude === void 0 || typeof longitude !== "number" || longitude < -180 || longitude > 180) {
          return {
            content: [{ type: "text", text: "❌ Invalid longitude. Must be a number between -180 and 180" }],
            isError: true
          };
        }
        if (radius === void 0 || typeof radius !== "number" || radius < 2e3 || radius > 2e5 || !Number.isInteger(radius)) {
          return {
            content: [{ type: "text", text: "❌ Radius must be an integer between 2000 and 200000 meters" }],
            isError: true
          };
        }
        if (maxAge !== void 0 && (maxAge < 0 || !Number.isInteger(maxAge))) {
          return {
            content: [{ type: "text", text: "❌ MaxAge must be a non-negative integer representing seconds" }],
            isError: true
          };
        }
        const area = {
          areaType: "CIRCLE",
          center: {
            latitude,
            longitude
          },
          radius
        };
        const verification = await verifyDeviceLocation(phoneNumber, area, maxAge);
        let response = `🎯 **Device Location Verification for ${phoneNumber}**

`;
        response += `📍 **Target Area**: Circle
`;
        response += `🌐 **Center**: ${latitude}, ${longitude}
`;
        response += `📏 **Radius**: ${radius} meters
`;
        if (maxAge !== void 0) {
          response += `⏱️ **Max Age Requested**: ${maxAge} seconds
`;
        }
        if (verification.lastLocationTime) {
          response += `🕒 **Last Location Time**: ${verification.lastLocationTime}
`;
        }
        response += `
`;
        let resultEmoji = "";
        let resultDescription = "";
        switch (verification.verificationResult) {
          case "TRUE":
            resultEmoji = "✅";
            resultDescription = "Device is within the requested area";
            break;
          case "FALSE":
            resultEmoji = "❌";
            resultDescription = "Device is NOT within the requested area";
            break;
          case "PARTIAL":
            resultEmoji = "🟡";
            resultDescription = `Device partially matches the area${verification.matchRate ? ` (${verification.matchRate}% match rate)` : ""}`;
            break;
          case "UNKNOWN":
            resultEmoji = "❓";
            resultDescription = "Unable to locate the device";
            break;
          default:
            resultEmoji = "⚪";
            resultDescription = "Unknown verification result";
        }
        response += `${resultEmoji} **Verification Result**: ${verification.verificationResult}
`;
        response += `📋 **Description**: ${resultDescription}
`;
        if (verification.matchRate && verification.verificationResult !== "PARTIAL") {
          response += `📊 **Match Rate**: ${verification.matchRate}%
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] verify-device-location error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to verify device location: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$7");
const registerTools$6 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "get-device-reachability-status",
    {
      title: "Get device reachability status",
      description: "Retrieve the current reachability status (connectivity) of a device/phone number",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33699901032)")
      }
    },
    async ({ phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33699901032)" }],
            isError: true
          };
        }
        const reachabilityStatus = await getDeviceReachabilityStatus(phoneNumber);
        let response = `📱 **Device Reachability Status for ${phoneNumber}**

`;
        if (reachabilityStatus.lastStatusTime) {
          response += `🕒 **Last Status Time**: ${reachabilityStatus.lastStatusTime}
`;
        }
        let statusEmoji = "";
        let statusDescription = "";
        switch (reachabilityStatus.reachabilityStatus) {
          case "CONNECTED_DATA":
            statusEmoji = "🟢";
            statusDescription = "Connected via data (can receive SMS and data)";
            break;
          case "CONNECTED_SMS":
            statusEmoji = "🟡";
            statusDescription = "Connected via SMS only (no data connection)";
            break;
          case "NOT_CONNECTED":
            statusEmoji = "🔴";
            statusDescription = "Not connected to the network";
            break;
          default:
            statusEmoji = "⚪";
            statusDescription = "Unknown status";
        }
        response += `${statusEmoji} **Reachability Status**: ${reachabilityStatus.reachabilityStatus}
`;
        response += `📋 **Description**: ${statusDescription}
`;
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] get-device-reachability-status error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get device reachability status: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$6");
const registerTools$5 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "get-device-roaming-status",
    {
      title: "Get device roaming status",
      description: "Retrieve roaming status and country information for a device/phone number",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33699901032)")
      }
    },
    async ({ phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33699901032)" }],
            isError: true
          };
        }
        const roamingStatus = await getDeviceRoamingStatus(phoneNumber);
        let response = `🌍 **Device Roaming Status for ${phoneNumber}**

`;
        if (roamingStatus.lastStatusTime) {
          response += `🕒 **Last Status Time**: ${roamingStatus.lastStatusTime}
`;
        }
        if (roamingStatus.roaming) {
          response += `📡 **Roaming Status**: Yes, device is roaming
`;
          if (roamingStatus.countryCode) {
            response += `🏳️ **Country Code**: ${roamingStatus.countryCode}
`;
          }
          if (roamingStatus.countryName && roamingStatus.countryName.length > 0) {
            response += `🌏 **Country Name**: ${roamingStatus.countryName.join(", ")}
`;
          }
        } else {
          response += `🏠 **Roaming Status**: No, device is in home network
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] get-device-roaming-status error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get device roaming status: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$5");
const performKYCMatch = /* @__PURE__ */ __name(async (request) => {
  try {
    const response = await makeRequest("/kyc-match/v0.2/match", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const kycResult = await response.json();
    return kycResult;
  } catch (error) {
    console.error("[API Client] Failed to perform KYC match:", error);
    throw new Error(`Failed to perform KYC match: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "performKYCMatch");
const registerTools$4 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "kyc-match",
    {
      title: "KYC Match",
      description: "Compare user information with verified data from the user's Operator for identity verification",
      inputSchema: {
        phoneNumber: z.string().optional().describe("Phone number in E.164 format (e.g., +34699901040)"),
        idDocument: z.string().optional().describe("ID number associated to the official identity document"),
        name: z.string().optional().describe("Complete name of the customer"),
        givenName: z.string().optional().describe("First/given name of the customer"),
        familyName: z.string().optional().describe("Last name, family name, or surname of the customer"),
        middleNames: z.string().optional().describe("Middle name/s of the customer"),
        familyNameAtBirth: z.string().optional().describe("Last/family/surname at birth of the customer"),
        address: z.string().optional().describe("Complete address of the customer"),
        streetName: z.string().optional().describe("Name of the street of the customer's address"),
        streetNumber: z.string().optional().describe("The street number of the customer's address"),
        postalCode: z.string().optional().describe("Zip code or postal code"),
        region: z.string().optional().describe("Region/prefecture of the customer's address"),
        locality: z.string().optional().describe("Locality of the customer's address"),
        country: z.string().optional().describe("Country of the customer's address (ISO 3166-1 alpha-2)"),
        houseNumberExtension: z.string().optional().describe("Specific identifier of the house (e.g., apartment number)"),
        birthdate: z.string().optional().describe("The birthdate of the customer (YYYY-MM-DD format)"),
        email: z.string().optional().describe("Email address of the customer"),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().describe("Gender of the customer")
      }
    },
    async (params) => {
      try {
        const providedParams = Object.values(params).filter((value) => value !== void 0 && value !== "").length;
        if (providedParams < 2) {
          return {
            content: [{ type: "text", text: "❌ At least two parameters must be provided for KYC matching" }],
            isError: true
          };
        }
        if (params.phoneNumber && !params.phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +34699901040)" }],
            isError: true
          };
        }
        if (params.birthdate && !params.birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid birthdate format. Use YYYY-MM-DD format" }],
            isError: true
          };
        }
        if (params.email && !params.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid email format" }],
            isError: true
          };
        }
        if (params.country && !params.country.match(/^[A-Z]{2}$/i)) {
          return {
            content: [{ type: "text", text: "❌ Invalid country format. Use ISO 3166-1 alpha-2 format (e.g., ES)" }],
            isError: true
          };
        }
        const kycResult = await performKYCMatch(params);
        let response = `🔍 **KYC Match Results**

`;
        if (params.phoneNumber) {
          response += `📱 **Phone Number**: ${params.phoneNumber}
`;
        }
        response += `
📊 **Match Results**:

`;
        const formatMatchResult = /* @__PURE__ */ __name((label, match, score) => {
          if (match === void 0) return "";
          let icon = "";
          let status = "";
          switch (match) {
            case "true":
              icon = "✅";
              status = "Match";
              break;
            case "false":
              icon = "❌";
              status = "No Match";
              break;
            case "not_available":
              icon = "⚪";
              status = "Not Available";
              break;
          }
          let result = `${icon} **${label}**: ${status}`;
          if (score !== void 0 && match === "false") {
            result += ` (Score: ${score}%)`;
          }
          result += "\n";
          return result;
        }, "formatMatchResult");
        if (kycResult.idDocumentMatch !== void 0) {
          response += formatMatchResult("ID Document", kycResult.idDocumentMatch);
        }
        if (kycResult.nameMatch !== void 0) {
          response += formatMatchResult("Name", kycResult.nameMatch, kycResult.nameMatchScore);
        }
        if (kycResult.givenNameMatch !== void 0) {
          response += formatMatchResult("Given Name", kycResult.givenNameMatch, kycResult.givenNameMatchScore);
        }
        if (kycResult.familyNameMatch !== void 0) {
          response += formatMatchResult("Family Name", kycResult.familyNameMatch, kycResult.familyNameMatchScore);
        }
        if (kycResult.middleNamesMatch !== void 0) {
          response += formatMatchResult("Middle Names", kycResult.middleNamesMatch, kycResult.middleNamesScore);
        }
        if (kycResult.familyNameAtBirthMatch !== void 0) {
          response += formatMatchResult(
            "Family Name at Birth",
            kycResult.familyNameAtBirthMatch,
            kycResult.familyNameAtBirthMatchScore
          );
        }
        if (kycResult.addressMatch !== void 0) {
          response += formatMatchResult("Address", kycResult.addressMatch, kycResult.addressMatchScore);
        }
        if (kycResult.streetNameMatch !== void 0) {
          response += formatMatchResult("Street Name", kycResult.streetNameMatch, kycResult.streetNameMatchScore);
        }
        if (kycResult.streetNumberMatch !== void 0) {
          response += formatMatchResult("Street Number", kycResult.streetNumberMatch, kycResult.streetNumberMatchScore);
        }
        if (kycResult.postalCodeMatch !== void 0) {
          response += formatMatchResult("Postal Code", kycResult.postalCodeMatch);
        }
        if (kycResult.regionMatch !== void 0) {
          response += formatMatchResult("Region", kycResult.regionMatch, kycResult.regionMatchScore);
        }
        if (kycResult.localityMatch !== void 0) {
          response += formatMatchResult("Locality", kycResult.localityMatch, kycResult.localityMatchScore);
        }
        if (kycResult.countryMatch !== void 0) {
          response += formatMatchResult("Country", kycResult.countryMatch);
        }
        if (kycResult.houseNumberExtensionMatch !== void 0) {
          response += formatMatchResult("House Number Extension", kycResult.houseNumberExtensionMatch);
        }
        if (kycResult.birthdateMatch !== void 0) {
          response += formatMatchResult("Birthdate", kycResult.birthdateMatch);
        }
        if (kycResult.emailMatch !== void 0) {
          response += formatMatchResult("Email", kycResult.emailMatch, kycResult.emailMatchScore);
        }
        if (kycResult.genderMatch !== void 0) {
          response += formatMatchResult("Gender", kycResult.genderMatch);
        }
        if (kycResult.nameKanaHankakuMatch !== void 0) {
          response += formatMatchResult(
            "Name Kana Hankaku",
            kycResult.nameKanaHankakuMatch,
            kycResult.nameKanaHankakuMatchScore
          );
        }
        if (kycResult.nameKanaZenkakuMatch !== void 0) {
          response += formatMatchResult(
            "Name Kana Zenkaku",
            kycResult.nameKanaZenkakuMatch,
            kycResult.nameKanaZenkakuMatchScore
          );
        }
        response += `
📝 **Note**: Match results show 'true' for exact matches, 'false' for non-matches (with similarity scores when available), and 'not_available' when the operator doesn't hold that information.`;
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] kyc-match error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to perform KYC match: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$4");
const config = config$2.api;
let cachedPlaygroundToken;
const getPlaygroundAdminToken = /* @__PURE__ */ __name(async () => {
  if (cachedPlaygroundToken && Date.now() < cachedPlaygroundToken.expiresAt) {
    return cachedPlaygroundToken.token;
  }
  try {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const response = await fetch("https://api.orange.com/oauth/v3/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(config.timeout)
    });
    if (!response.ok) {
      const errorText = await response.text();
      cachedPlaygroundToken = void 0;
      throw new Error(`Playground OAuth token request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const tokenData = await response.json();
    const expiresIn = tokenData.expires_in || 3600;
    cachedPlaygroundToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1e3
      // 60 seconds buffer
    };
    console.error("[API Client] Successfully obtained playground admin access token");
    return tokenData.access_token;
  } catch (error) {
    console.error("[API Client] Failed to get playground admin access token:", error);
    cachedPlaygroundToken = void 0;
    throw new Error(
      `Failed to obtain playground admin access token: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}, "getPlaygroundAdminToken");
const adminAction = /* @__PURE__ */ __name(async (action) => {
  try {
    const accessToken = await getPlaygroundAdminToken();
    const response = await fetch("https://api.orange.com/camara/playground/admin/v1.0/action", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(action),
      signal: AbortSignal.timeout(config.timeout)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const adminResponse = await response.json();
    return adminResponse;
  } catch (error) {
    console.error("[API Client] Failed to execute admin action:", error);
    throw new Error(`Failed to execute admin action: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}, "adminAction");
const registerTools$3 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "list-playground-phone-numbers",
    {
      title: "List playground phone numbers",
      description: "List all phone numbers in the playground",
      inputSchema: {}
    },
    async () => {
      try {
        const result = await adminAction({ action: "LIST" });
        let response = `📋 **Playground Phone Numbers**

`;
        if ("phoneNumbers" in result) {
          if (result.phoneNumbers.length === 0) {
            response += `📱 **Count**: 0 phone numbers
`;
            response += `ℹ️ **Info**: No phone numbers found in playground
`;
          } else {
            response += `📱 **Count**: ${result.phoneNumbers.length} phone numbers

`;
            response += `📞 **Phone Numbers**:
`;
            result.phoneNumbers.forEach((phoneNumber, index) => {
              response += `  ${index + 1}. ${phoneNumber}
`;
            });
          }
        } else {
          response += `❌ **Error**: Unexpected response format
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] list-playground-phone-numbers error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to list phone numbers: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "create-playground-phone-number",
    {
      title: "Create playground phone number",
      description: "Create a new phone number in the playground with default data",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)")
      }
    },
    async ({ phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        const result = await adminAction({ action: "CREATE", phoneNumber });
        let response = `✅ **Phone Number Created**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        if ("data" in result) {
          response += `
📊 **Default Data Created**:
`;
          response += `  📡 **Reachability**: ${result.data.reachability.reachabilityStatus}
`;
          response += `  🌍 **Roaming**: ${result.data.roaming.roaming ? "Yes" : "No"}
`;
          response += `  📍 **Location**: Available: ${result.data.location.available}
`;
          response += `  🔄 **SIM Swap**: ${result.data.simSwap.latestSimChange}
`;
          response += `  👤 **KYC**: ${Object.keys(result.data.kyc).length} fields configured
`;
        }
        response += `
🎯 **Next Steps**: Use update commands to modify the phone number data as needed.
`;
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] create-playground-phone-number error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to create phone number: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "read-playground-phone-number",
    {
      title: "Read playground phone number data",
      description: "Read all data associated with a phone number in the playground",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)")
      }
    },
    async ({ phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        const result = await adminAction({ action: "READ", phoneNumber });
        let response = `📖 **Phone Number Data**

`;
        response += `📞 **Phone Number**: ${phoneNumber}

`;
        if ("data" in result) {
          const data = result.data;
          response += `📡 **Reachability Status**:
`;
          response += `  Status: ${data.reachability.reachabilityStatus}
`;
          if (data.reachability.lastStatusTime) {
            response += `  Last Status Time: ${data.reachability.lastStatusTime}
`;
          }
          response += `
`;
          response += `🌍 **Roaming Status**:
`;
          response += `  Roaming: ${data.roaming.roaming ? "Yes" : "No"}
`;
          if (data.roaming.lastStatusTime) {
            response += `  Last Status Time: ${data.roaming.lastStatusTime}
`;
          }
          if (data.roaming.countryCode) {
            response += `  Country Code: ${data.roaming.countryCode}
`;
          }
          if (data.roaming.countryName && data.roaming.countryName.length > 0) {
            response += `  Country Name: ${data.roaming.countryName.join(", ")}
`;
          }
          response += `
`;
          response += `📍 **Location**:
`;
          response += `  Available: ${data.location.available}
`;
          response += `  Last Location Time: ${data.location.lastLocationTime}
`;
          response += `  Latitude: ${data.location.latitude}
`;
          response += `  Longitude: ${data.location.longitude}
`;
          response += `  Radius: ${data.location.radius} meters
`;
          response += `
`;
          response += `🔄 **SIM Swap**:
`;
          response += `  Latest SIM Change: ${data.simSwap.latestSimChange}
`;
          response += `
`;
          response += `👤 **KYC Data**:
`;
          if (data.kyc.name) response += `  Name: ${data.kyc.name}
`;
          if (data.kyc.givenName) response += `  Given Name: ${data.kyc.givenName}
`;
          if (data.kyc.familyName) response += `  Family Name: ${data.kyc.familyName}
`;
          if (data.kyc.email) response += `  Email: ${data.kyc.email}
`;
          if (data.kyc.birthdate) response += `  Birthdate: ${data.kyc.birthdate}
`;
          if (data.kyc.gender) response += `  Gender: ${data.kyc.gender}
`;
          if (data.kyc.address) response += `  Address: ${data.kyc.address}
`;
          if (data.kyc.country) response += `  Country: ${data.kyc.country}
`;
          const kycFields = Object.keys(data.kyc).filter((key) => data.kyc[key]);
          if (kycFields.length === 0) {
            response += `  No KYC data configured
`;
          }
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] read-playground-phone-number error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to read phone number data: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "update-playground-phone-location",
    {
      title: "Update playground phone number location",
      description: "Update the location data for a phone number in the playground",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)"),
        latitude: z.number().min(-90).max(90).describe("Latitude (-90 to 90)"),
        longitude: z.number().min(-180).max(180).describe("Longitude (-180 to 180)"),
        radius: z.number().min(1).describe("Radius in meters"),
        available: z.boolean().optional().describe("Location availability (default: true)"),
        lastLocationTime: z.string().optional().describe("Last location time (ISO format, default: current time)")
      }
    },
    async ({ phoneNumber, latitude, longitude, radius, available, lastLocationTime }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        if (latitude < -90 || latitude > 90) {
          return {
            content: [{ type: "text", text: "❌ Latitude must be between -90 and 90" }],
            isError: true
          };
        }
        if (longitude < -180 || longitude > 180) {
          return {
            content: [{ type: "text", text: "❌ Longitude must be between -180 and 180" }],
            isError: true
          };
        }
        if (radius < 1) {
          return {
            content: [{ type: "text", text: "❌ Radius must be at least 1 meter" }],
            isError: true
          };
        }
        const updateData = {
          location: {
            available: available ?? true,
            lastLocationTime: lastLocationTime || (/* @__PURE__ */ new Date()).toISOString(),
            latitude,
            longitude,
            radius
          }
        };
        const result = await adminAction({ action: "UPDATE", phoneNumber, data: updateData });
        let response = `📍 **Location Updated**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        response += `🌐 **New Location**:
`;
        response += `  Latitude: ${latitude}
`;
        response += `  Longitude: ${longitude}
`;
        response += `  Radius: ${radius} meters
`;
        response += `  Available: ${updateData.location.available}
`;
        response += `  Last Location Time: ${updateData.location.lastLocationTime}
`;
        if ("data" in result) {
          response += `
✅ **Update successful!** Location data has been updated.
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] update-playground-phone-location error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to update phone number location: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "update-playground-phone-kyc",
    {
      title: "Update playground phone number KYC",
      description: "Update the KYC (Know Your Customer) data for a phone number in the playground",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)"),
        name: z.string().optional().describe("Full name"),
        givenName: z.string().optional().describe("Given/first name"),
        familyName: z.string().optional().describe("Family/last name"),
        email: z.string().email().optional().describe("Email address"),
        birthdate: z.string().optional().describe("Birthdate (YYYY-MM-DD format)"),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().describe("Gender"),
        address: z.string().optional().describe("Full address"),
        country: z.string().optional().describe("Country")
      }
    },
    async ({ phoneNumber, name, givenName, familyName, email, birthdate, gender, address, country }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        const kycData = {};
        if (name) kycData.name = name;
        if (givenName) kycData.givenName = givenName;
        if (familyName) kycData.familyName = familyName;
        if (email) kycData.email = email;
        if (birthdate) kycData.birthdate = birthdate;
        if (gender) kycData.gender = gender;
        if (address) kycData.address = address;
        if (country) kycData.country = country;
        if (Object.keys(kycData).length === 0) {
          return {
            content: [{ type: "text", text: "❌ At least one KYC field must be provided" }],
            isError: true
          };
        }
        const updateData = {
          kyc: kycData
        };
        const result = await adminAction({ action: "UPDATE", phoneNumber, data: updateData });
        let response = `👤 **KYC Data Updated**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        response += `📝 **Updated KYC Fields**:
`;
        Object.entries(kycData).forEach(([key, value]) => {
          response += `  ${key}: ${value}
`;
        });
        if ("data" in result) {
          response += `
✅ **Update successful!** KYC data has been updated.
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] update-playground-phone-kyc error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to update phone number KYC: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "delete-playground-phone-number",
    {
      title: "Delete playground phone number",
      description: "Delete a phone number and all its data from the playground (WARNING: irreversible)",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)"),
        confirm: z.boolean().describe("Confirmation flag - must be true to proceed with deletion")
      }
    },
    async ({ phoneNumber, confirm }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        if (!confirm) {
          return {
            content: [
              {
                type: "text",
                text: "⚠️ **Deletion requires confirmation**\n\nTo delete this phone number, set the `confirm` parameter to `true`.\n\n**WARNING**: This action cannot be undone!"
              }
            ],
            isError: true
          };
        }
        const result = await adminAction({ action: "DELETE", phoneNumber });
        let response = `🗑️ **Phone Number Deleted**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        response += `✅ **Status**: Successfully deleted from playground
`;
        response += `⚠️ **Note**: This action cannot be undone
`;
        if ("data" in result) {
          response += `
📊 **Final Data** (for reference):
`;
          response += `  All associated data has been permanently removed
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] delete-playground-phone-number error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to delete phone number: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "update-playground-phone-reachability",
    {
      title: "Update playground phone number reachability",
      description: "Update the reachability status for a phone number in the playground",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)"),
        reachabilityStatus: z.enum(["CONNECTED_DATA", "CONNECTED_SMS", "NOT_CONNECTED"]).describe("Reachability status"),
        lastStatusTime: z.string().optional().describe("Last status time (ISO format, default: current time)")
      }
    },
    async ({ phoneNumber, reachabilityStatus, lastStatusTime }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        const updateData = {
          reachability: {
            reachabilityStatus,
            lastStatusTime: lastStatusTime || (/* @__PURE__ */ new Date()).toISOString()
          }
        };
        const result = await adminAction({ action: "UPDATE", phoneNumber, data: updateData });
        let response = `📡 **Reachability Status Updated**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        response += `📶 **New Reachability Status**: ${reachabilityStatus}
`;
        let statusDescription = "";
        switch (reachabilityStatus) {
          case "CONNECTED_DATA":
            statusDescription = "Connected via data (can receive SMS and data)";
            break;
          case "CONNECTED_SMS":
            statusDescription = "Connected via SMS only (no data connection)";
            break;
          case "NOT_CONNECTED":
            statusDescription = "Not connected to the network";
            break;
        }
        response += `📋 **Description**: ${statusDescription}
`;
        response += `🕒 **Last Status Time**: ${updateData.reachability.lastStatusTime}
`;
        if ("data" in result) {
          response += `
✅ **Update successful!** Reachability status has been updated.
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] update-playground-phone-reachability error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to update phone number reachability: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "update-playground-phone-roaming",
    {
      title: "Update playground phone number roaming",
      description: "Update the roaming status for a phone number in the playground",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)"),
        roaming: z.boolean().describe("Roaming status (true if roaming, false if home network)"),
        countryCode: z.number().optional().describe("Country code (required if roaming is true)"),
        countryName: z.array(z.string()).optional().describe("Country name(s) (optional)"),
        lastStatusTime: z.string().optional().describe("Last status time (ISO format, default: current time)")
      }
    },
    async ({ phoneNumber, roaming, countryCode, countryName, lastStatusTime }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        if (roaming && !countryCode) {
          return {
            content: [{ type: "text", text: "❌ Country code is required when roaming is true" }],
            isError: true
          };
        }
        const updateData = {
          roaming: {
            roaming,
            lastStatusTime: lastStatusTime || (/* @__PURE__ */ new Date()).toISOString(),
            ...countryCode && { countryCode },
            ...countryName && countryName.length > 0 && { countryName }
          }
        };
        const result = await adminAction({ action: "UPDATE", phoneNumber, data: updateData });
        let response = `🌍 **Roaming Status Updated**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        response += `📡 **Roaming**: ${roaming ? "Yes (device is roaming)" : "No (device is in home network)"}
`;
        if (countryCode) {
          response += `🏳️ **Country Code**: ${countryCode}
`;
        }
        if (countryName && countryName.length > 0) {
          response += `🌏 **Country Name**: ${countryName.join(", ")}
`;
        }
        response += `🕒 **Last Status Time**: ${updateData.roaming.lastStatusTime}
`;
        if ("data" in result) {
          response += `
✅ **Update successful!** Roaming status has been updated.
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] update-playground-phone-roaming error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to update phone number roaming: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "update-playground-phone-sim-swap",
    {
      title: "Update playground phone number SIM swap",
      description: "Update the SIM swap data for a phone number in the playground",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33612345678)"),
        latestSimChange: z.string().describe("Latest SIM change timestamp (ISO format, e.g., 2024-01-01T12:00:00.000Z)")
      }
    },
    async ({ phoneNumber, latestSimChange }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33612345678)" }],
            isError: true
          };
        }
        if (!latestSimChange || typeof latestSimChange !== "string") {
          return {
            content: [{ type: "text", text: "❌ Latest SIM change timestamp is required and must be a string" }],
            isError: true
          };
        }
        const simChangeDate = new Date(latestSimChange);
        if (isNaN(simChangeDate.getTime())) {
          return {
            content: [
              { type: "text", text: "❌ Invalid date format. Use ISO format (e.g., 2024-01-01T12:00:00.000Z)" }
            ],
            isError: true
          };
        }
        const updateData = {
          simSwap: {
            latestSimChange
          }
        };
        const result = await adminAction({ action: "UPDATE", phoneNumber, data: updateData });
        let response = `🔄 **SIM Swap Updated**

`;
        response += `📞 **Phone Number**: ${phoneNumber}
`;
        response += `🔄 **Latest SIM Change**: ${latestSimChange}
`;
        const now = /* @__PURE__ */ new Date();
        const diffMs = now.getTime() - simChangeDate.getTime();
        const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
        if (diffMs > 0) {
          if (diffDays > 0) {
            response += `⏱️ **Time Ago**: ${diffDays} days ago
`;
          } else if (diffHours > 0) {
            response += `⏱️ **Time Ago**: ${diffHours} hours ago
`;
          } else {
            response += `⏱️ **Time Ago**: Less than 1 hour ago
`;
          }
        } else {
          response += `⏱️ **Time**: Future date (${Math.abs(diffDays)} days from now)
`;
        }
        if ("data" in result) {
          response += `
✅ **Update successful!** SIM swap data has been updated.
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] update-playground-phone-sim-swap error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to update phone number SIM swap: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$3");
const getPopulationDensityData = /* @__PURE__ */ __name(async (request) => {
  try {
    const response = await makeRequest("/population-density-data/v0.2/retrieve", {
      method: "POST",
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: "UNKNOWN_ERROR",
        message: response.statusText
      }));
      throw new Error(`API Error ${errorData.status}: ${errorData.code} - ${errorData.message}`);
    }
    const populationData = await response.json();
    return populationData;
  } catch (error) {
    console.error("[API Client] Failed to get population density data:", error);
    throw new Error(
      `Failed to get population density data: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}, "getPopulationDensityData");
const registerTools$2 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "get-population-density-data",
    {
      title: "Get population density data",
      description: "Retrieve population density estimations for a specified polygonal area and time interval",
      inputSchema: {
        boundary: z.array(
          z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180)
          })
        ).min(3).max(15).describe("Array of points defining the polygon boundary (3-15 points)"),
        startTime: z.string().describe("Start date time in RFC 3339 format (e.g., 2024-04-23T14:44:18.165Z)"),
        endTime: z.string().describe("End date time in RFC 3339 format (e.g., 2024-04-23T14:44:18.165Z)"),
        precision: z.number().min(1).max(12).optional().describe("Precision level (geohash length) between 1-12, default is 7")
      }
    },
    async ({ boundary, startTime, endTime, precision }) => {
      try {
        if (!boundary || !Array.isArray(boundary) || boundary.length < 3 || boundary.length > 15) {
          return {
            content: [{ type: "text", text: "❌ Boundary must be an array of 3-15 points defining a polygon" }],
            isError: true
          };
        }
        for (let i = 0; i < boundary.length; i++) {
          const point = boundary[i];
          if (!point || typeof point.latitude !== "number" || typeof point.longitude !== "number") {
            return {
              content: [{ type: "text", text: `❌ Point ${i + 1} must have valid latitude and longitude numbers` }],
              isError: true
            };
          }
          if (point.latitude < -90 || point.latitude > 90) {
            return {
              content: [{ type: "text", text: `❌ Point ${i + 1} latitude must be between -90 and 90` }],
              isError: true
            };
          }
          if (point.longitude < -180 || point.longitude > 180) {
            return {
              content: [{ type: "text", text: `❌ Point ${i + 1} longitude must be between -180 and 180` }],
              isError: true
            };
          }
        }
        if (!startTime || typeof startTime !== "string") {
          return {
            content: [{ type: "text", text: "❌ Start time is required and must be a string in RFC 3339 format" }],
            isError: true
          };
        }
        if (!endTime || typeof endTime !== "string") {
          return {
            content: [{ type: "text", text: "❌ End time is required and must be a string in RFC 3339 format" }],
            isError: true
          };
        }
        if (precision !== void 0 && (precision < 1 || precision > 12 || !Number.isInteger(precision))) {
          return {
            content: [{ type: "text", text: "❌ Precision must be an integer between 1 and 12" }],
            isError: true
          };
        }
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return {
            content: [
              { type: "text", text: "❌ Invalid date format. Use RFC 3339 format (e.g., 2024-04-23T14:44:18.165Z)" }
            ],
            isError: true
          };
        }
        if (startDate >= endDate) {
          return {
            content: [{ type: "text", text: "❌ End time must be after start time" }],
            isError: true
          };
        }
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = timeDiff / (1e3 * 60 * 60 * 24);
        if (daysDiff > 7) {
          return {
            content: [{ type: "text", text: "❌ Time period cannot be greater than 7 days" }],
            isError: true
          };
        }
        const request = {
          area: {
            areaType: "POLYGON",
            boundary
          },
          startTime,
          endTime,
          precision: precision || 7
        };
        const populationData = await getPopulationDensityData(request);
        let response = `🌍 **Population Density Data**

`;
        response += `📍 **Area**: Polygon with ${boundary.length} points
`;
        response += `⏱️ **Time Period**: ${startTime} to ${endTime}
`;
        response += `🎯 **Precision Level**: ${precision || 7} (geohash length)
`;
        let statusEmoji = "";
        let statusDescription = "";
        switch (populationData.status) {
          case "SUPPORTED_AREA":
            statusEmoji = "✅";
            statusDescription = "The whole requested area is supported";
            break;
          case "PART_OF_AREA_NOT_SUPPORTED":
            statusEmoji = "🟡";
            statusDescription = "Part of the requested area is outside coverage";
            break;
          case "AREA_NOT_SUPPORTED":
            statusEmoji = "❌";
            statusDescription = "The whole requested area is outside coverage";
            break;
          case "OPERATION_NOT_COMPLETED":
            statusEmoji = "🔴";
            statusDescription = "An error occurred during processing";
            break;
          default:
            statusEmoji = "⚪";
            statusDescription = "Unknown status";
        }
        response += `${statusEmoji} **Status**: ${populationData.status}
`;
        response += `📋 **Description**: ${statusDescription}
`;
        if (populationData.statusInfo) {
          response += `ℹ️ **Status Info**: ${populationData.statusInfo}
`;
        }
        response += `
`;
        if (populationData.timedPopulationDensityData.length > 0) {
          response += `📊 **Population Density Data** (${populationData.timedPopulationDensityData.length} time intervals):

`;
          populationData.timedPopulationDensityData.forEach((timeData, index) => {
            response += `**Interval ${index + 1}**: ${timeData.startTime} to ${timeData.endTime}
`;
            const densityEstimations = timeData.cellPopulationDensityData.filter(
              (cell) => cell.dataType === "DENSITY_ESTIMATION"
            );
            const lowDensityCells = timeData.cellPopulationDensityData.filter((cell) => cell.dataType === "LOW_DENSITY");
            const noDataCells = timeData.cellPopulationDensityData.filter((cell) => cell.dataType === "NO_DATA");
            response += `  📈 Cells with density data: ${densityEstimations.length}
`;
            response += `  🔽 Low density cells: ${lowDensityCells.length}
`;
            response += `  ❌ No data cells: ${noDataCells.length}
`;
            if (densityEstimations.length > 0) {
              const avgDensity = Math.round(
                densityEstimations.reduce((sum, cell) => sum + (cell.pplDensity || 0), 0) / densityEstimations.length
              );
              const maxDensity = Math.max(...densityEstimations.map((cell) => cell.pplDensity || 0));
              const minDensity = Math.min(...densityEstimations.map((cell) => cell.pplDensity || 0));
              response += `  📊 Average density: ${avgDensity} people/km²
`;
              response += `  📈 Max density: ${maxDensity} people/km²
`;
              response += `  📉 Min density: ${minDensity} people/km²
`;
            }
            response += `
`;
          });
          const firstInterval = populationData.timedPopulationDensityData[0];
          if (firstInterval && firstInterval.cellPopulationDensityData.length > 0) {
            response += `🔍 **Detailed Cell Data** (First interval):
`;
            const cellData = firstInterval.cellPopulationDensityData.slice(0, 5);
            cellData.forEach((cell, index) => {
              response += `  **Cell ${index + 1}** (${cell.geohash}):
`;
              response += `    Type: ${cell.dataType}
`;
              if (cell.dataType === "DENSITY_ESTIMATION") {
                response += `    Density: ${cell.pplDensity} people/km² (${cell.minPplDensity}-${cell.maxPplDensity})
`;
              }
            });
            if (firstInterval.cellPopulationDensityData.length > 5) {
              response += `  ... and ${firstInterval.cellPopulationDensityData.length - 5} more cells
`;
            }
          }
        } else {
          response += `📊 **Population Density Data**: No data available for the requested area
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] get-population-density-data error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get population density data: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$2");
const registerTools$1 = /* @__PURE__ */ __name((mcpServer2) => {
  mcpServer2.registerTool(
    "get-sim-swap-date",
    {
      title: "Get SIM swap date",
      description: "Retrieve the timestamp of the latest SIM swap event for a phone number",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33699901032)")
      }
    },
    async ({ phoneNumber }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33699901032)" }],
            isError: true
          };
        }
        const simSwapInfo = await getSimSwapDate(phoneNumber);
        let response = `📱 **SIM Swap Date for ${phoneNumber}**

`;
        if (simSwapInfo.latestSimChange) {
          response += `🔄 **Latest SIM Change**: ${simSwapInfo.latestSimChange}
`;
          response += `✅ **Has SIM Swap**: Yes
`;
        } else {
          response += `🔄 **Latest SIM Change**: No SIM swap detected
`;
          response += `❌ **Has SIM Swap**: No
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] get-sim-swap-date error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get SIM swap date: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
  mcpServer2.registerTool(
    "check-sim-swap",
    {
      title: "Check SIM swap",
      description: "Check if a SIM swap occurred in the last X hours for a phone number",
      inputSchema: {
        phoneNumber: z.string().describe("Phone number in E.164 format (e.g., +33699901032)"),
        hours: z.number().describe("Number of hours to check back (e.g., 24 for last 24 hours)")
      }
    },
    async ({ phoneNumber, hours }) => {
      try {
        if (!phoneNumber || typeof phoneNumber !== "string") {
          return {
            content: [{ type: "text", text: "❌ Phone number is required and must be a string" }],
            isError: true
          };
        }
        if (!phoneNumber.match(/^\+[1-9][0-9]{4,14}$/)) {
          return {
            content: [{ type: "text", text: "❌ Invalid phone number format. Use E.164 format (e.g., +33699901032)" }],
            isError: true
          };
        }
        if (hours === void 0 || typeof hours !== "number" || hours < 1 || hours > 2400 || !Number.isInteger(hours)) {
          return {
            content: [{ type: "text", text: "❌ Hours must be an integer between 1 and 2400" }],
            isError: true
          };
        }
        const simSwapCheck = await checkSimSwap(phoneNumber, hours);
        let response = `📱 **SIM Swap Check for ${phoneNumber}**

`;
        response += `⏱️ **Period Checked**: Last ${hours} hours
`;
        if (simSwapCheck.swapped) {
          response += `🚨 **SIM Swap Detected**: Yes
`;
          response += `⚠️ **Warning**: A SIM swap occurred in the last ${hours} hours
`;
        } else {
          response += `✅ **SIM Swap Detected**: No
`;
          response += `🛡️ **Status**: No SIM swap detected in the last ${hours} hours
`;
        }
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        console.error("[MCP Tool] check-sim-swap error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to check SIM swap: ${error instanceof Error ? error.message : "Unknown error"}`
            }
          ],
          isError: true
        };
      }
    }
  );
}, "registerTools$1");
const registerTools = /* @__PURE__ */ __name((mcpServer2) => {
  registerTools$8(mcpServer2);
  registerTools$7(mcpServer2);
  registerTools$6(mcpServer2);
  registerTools$5(mcpServer2);
  registerTools$4(mcpServer2);
  registerTools$3(mcpServer2);
  registerTools$2(mcpServer2);
  registerTools$1(mcpServer2);
}, "registerTools");
const mcpServer = new McpServer({
  name: "echo-server",
  version: "1.0.0"
});
registerResources(mcpServer);
registerTools(mcpServer);
registerPrompts(mcpServer);
// In-memory store for verification codes (phoneNumber -> code)
const verificationCodes = /* @__PURE__ */ new Map();

/**
 * Start a tiny HTTP proxy that exposes simplified CAMARA Number Verification
 * endpoints for local/playground development. This keeps the backend routed
 * through the MCP server as the canonical integration point.
 *
 * Routes implemented:
 * - POST /number-verification/v0.3/verify-with-code/send-code
 *     body: { phoneNumber }
 *     -> checks playground phone via adminAction READ, generates a 6-digit code,
 *        stores it in-memory and responds with 204 No Content on success.
 * - POST /number-verification/v0.3/verify-with-code/verify
 *     body: { phoneNumber, code }
 *     -> validates code and responds { devicePhoneNumberVerified: true } on success
 */
function startHttpProxy() {
  const port = parseInt(process.env.MCP_PROXY_PORT || "3001", 10);
  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method || "";
      const parsed = new URL(req.url || "", `http://localhost`);
      // Only accept JSON bodies
      const readBody = async () => {
        let body = "";
        for await (const chunk of req) body += chunk;
        return body ? JSON.parse(body) : {};
      };

      if (method === "POST" && parsed.pathname === "/number-verification/v0.3/verify-with-code/send-code") {
        const data = await readBody();
        const phoneNumber = data && data.phoneNumber;
        if (!phoneNumber) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: 400, message: "phoneNumber is required" }));
          return;
        }

        try {
          // Validate phone exists in playground using admin READ
          await adminAction({ action: "READ", phoneNumber });
        } catch (err) {
          console.error("[MCP Proxy] playground READ failed for", phoneNumber, err instanceof Error ? err.message : err);
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: 404, message: "phone number not found in playground" }));
          return;
        }

        // Generate a temporary 6-digit code and store it
        const code = String(Math.floor(100000 + Math.random() * 900000));
        verificationCodes.set(phoneNumber, code);
        console.error(`[MCP Proxy] send-code for ${phoneNumber} -> code=${code}`);

        // Respond like CAMARA send-code (204 No Content)
        // Include code in header for demo/testing purposes
        res.writeHead(204, { 
          'X-Verification-Code': code,
          'Access-Control-Expose-Headers': 'X-Verification-Code'
        });
        res.end();
        return;
      }

      if (method === "POST" && parsed.pathname === "/number-verification/v0.3/verify-with-code/verify") {
        const data = await readBody();
        const phoneNumber = data && data.phoneNumber;
        const code = data && data.code;
        if (!phoneNumber || !code) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: 400, message: "phoneNumber and code are required" }));
          return;
        }

        const expected = verificationCodes.get(phoneNumber);
        if (expected && String(code) === String(expected)) {
          // Success
          verificationCodes.delete(phoneNumber);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ devicePhoneNumberVerified: true }));
          console.error(`[MCP Proxy] verify success for ${phoneNumber}`);
          return;
        }

        // Invalid code
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ devicePhoneNumberVerified: false, error: "invalid_code" }));
        console.error(`[MCP Proxy] verify failed for ${phoneNumber} (expected=${expected} provided=${code})`);
        return;
      }

      // Unknown path
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: 404, message: "Not found" }));
    } catch (error) {
      console.error("[MCP Proxy] error handling request:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: 500, message: String(error instanceof Error ? error.message : error) }));
    }
  });

  server.listen(port, () => {
    console.error(`[MCP Proxy] Listening for number-verification proxy on http://localhost:${port}`);
  });
}
async function main() {
  try {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("[MCP server]: Conected");
    // Start the HTTP proxy for number verification (local dev)
    try {
      startHttpProxy();
    } catch (err) {
      console.error('[MCP Proxy] failed to start proxy:', err);
    }
  } catch (error) {
    console.error("[MCP Server] Failed to start:", error);
    process.exit(1);
  }
}
__name(main, "main");
process.on("SIGINT", () => {
  console.error("[MCP Server] Shutting down gracefully...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.error("[MCP Server] Shutting down gracefully...");
  process.exit(0);
});
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
