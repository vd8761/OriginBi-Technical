import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the tracing root to this frontend directory so Next.js doesn't
  // walk up to C:\Users\Jaya Krishna and get confused by the lockfile there.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*", // NestJS Assessment Service
      },
      {
        source: "/v1/:path*",
        destination: "http://localhost:8088/v1/:path*", // Go Exam Engine
      },
      {
        source: "/student-api/:path*",
        destination: "http://localhost:4004/:path*", // Student Service
      },
      {
        source: "/auth-api/:path*",
        destination: "http://localhost:4002/:path*", // Cognito Auth Service
      },
    ];
  },
} as any;

export default nextConfig;
