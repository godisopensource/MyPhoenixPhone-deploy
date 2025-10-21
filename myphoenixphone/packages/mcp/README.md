# MCP helper package

This package provides an npm wrapper to start the local MCP server located in `network-apis-mcp`.

Start the MCP server with your playground credentials:

```bash
ORANGE_CLIENT_ID=your_client_id ORANGE_CLIENT_SECRET=your_client_secret npm run mcp:start
```

You can also run it directly:

```bash
cd network-apis-mcp
ORANGE_CLIENT_ID=... ORANGE_CLIENT_SECRET=... npm start
```
