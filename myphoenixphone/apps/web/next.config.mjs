import path from 'path';

// Determine directory for this config file (Esm-safe)
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const nextConfig = {
  experimental: {
    turbopack: true,
  },
};

export default nextConfig;
