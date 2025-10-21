Development notes

You can start the MCP server as part of the monorepo `turbo dev` pipeline.

From repository root run:

```bash
# set playground credentials and run turbo dev
ORANGE_CLIENT_ID=... ORANGE_CLIENT_SECRET=... npm run dev
```

`turbo run dev` will run the `dev` script in workspaces that define it. We added a `dev` script to `packages/mcp` so the MCP server will be started automatically alongside other `dev` scripts (like `apps/backend`'s `start:dev`).

If you prefer to start just the MCP server:

```bash
npm --workspace packages/mcp run dev
```
