# Orange Network API MCP Server

A Model Context Protocol (MCP) server that provides tools to interact with Orange's Network APIs including device location, roaming status, SIM swap detection, and playground administration.

## Requirements

- Node.js >= 24.0.0
- Orange API credentials from https://developer.orange.com/apis/camara-playground

## Installation

Extract the ZIP file to your desired location

## Credential

If you have already subscribed to the playgound APIs you can retrieve your credential from https://developer.orange.com/myapps.

Otherwise you can subscribe to the playground APIs from here: https://developer.orange.com/myapps/new/addapi/camara-playground

## Usage with MCP Clients

### Claude Desktop

Add this configuration to your Claude Desktop MCP settings file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "orange-network-api": {
      "command": "node",
      "args": ["/path/to/extracted/package/index.js"],
      "env": {
        "ORANGE_CLIENT_ID": "your_client_id",
        "ORANGE_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

Replace `/path/to/extracted/package/` with the actual path to this package.

### Other MCP Applications

```bash
ORANGE_CLIENT_ID=your_client_id ORANGE_CLIENT_SECRET=your_client_secret node index.js
```

## Available Tools

- `get-device-location`: Get device location
- `verify-device-location`: Verify device is within an area
- `get-device-reachability-status`: Check device connectivity
- `get-device-roaming-status`: Check roaming status
- `check-sim-swap`: Detect recent SIM swaps
- `get-sim-swap-date`: Get latest SIM swap date
- `get-population-density-data`: Get area population density
- `kyc-match`: Identity verification
- `list-playground-phone-numbers`: List playground numbers
- `create-playground-phone-number`: Add playground number
- `update-playground-phone-*`: Update playground data
- `delete-playground-phone-number`: Remove playground number
