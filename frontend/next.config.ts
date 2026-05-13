import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Turbopack is experimental and may cause issues in some CI environments like Cloudflare Pages
  /*
  turbopack: {
    root: path.resolve(__dirname),
  },
  */
  experimental: {
    preloadEntriesOnStart: false,
    turbopackSourceMaps: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
} as any;

export default nextConfig;
