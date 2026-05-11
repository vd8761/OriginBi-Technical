import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    preloadEntriesOnStart: false,
    turbopackSourceMaps: false,
  },
};

export default nextConfig;
