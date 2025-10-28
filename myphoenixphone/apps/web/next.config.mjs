// Keep config minimal and stable in dev; avoid experimental Turbopack by default
const nextConfig = {
  experimental: {
    // Enable Turbopack only when explicitly requested to avoid known ENOENT races
    // with temporary build manifest files on macOS for monorepos.
    turbopack: process.env.NEXT_TURBOPACK === '1',
  },
};

export default nextConfig;
