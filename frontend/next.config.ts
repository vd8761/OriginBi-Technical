import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the tracing root to this frontend directory so Next.js doesn't
  // walk up to C:\Users\Jaya Krishna and get confused by the lockfile there.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

} as any;

export default nextConfig;
