/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    preloadEntriesOnStart: false,
    turbopackSourceMaps: false,
  },
};

module.exports = nextConfig;
