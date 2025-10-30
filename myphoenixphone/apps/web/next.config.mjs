// Keep config minimal and stable in dev; avoid experimental Turbopack by default
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Monorepo root is two levels up from apps/web
const workspaceRoot = path.resolve(__dirname, '../..');

const nextConfig = {
  // Set the workspace root to silence the lockfile warning on non-Vercel platforms too
  outputFileTracingRoot: process.env.VERCEL ? '/vercel/path0' : workspaceRoot,
  experimental: {
    // Enable Turbopack only when explicitly requested to avoid known ENOENT races
    // with temporary build manifest files on macOS for monorepos.
    turbopack: process.env.NEXT_TURBOPACK === '1',
  },
};

export default nextConfig;
