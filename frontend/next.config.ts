import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(),
  },
  experimental: {
    preloadEntriesOnStart: false,
    turbopackSourceMaps: false,
  },
};

export default nextConfig;
