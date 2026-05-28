import type { NextConfig } from "next";

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:4002";
const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || "http://localhost:4004";
const ADMIN_API_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "http://localhost:4001";
const EXAM_ENGINE_URL = process.env.NEXT_PUBLIC_EXAM_ENGINE_URL || "http://localhost:8088";
const ASSESSMENT_SERVICE_URL = process.env.NEXT_PUBLIC_ASSESSMENT_SERVICE_URL || "http://localhost:5000";
const JUDGE0_URL = process.env.NEXT_PUBLIC_JUDGE0_URL || "http://localhost:2358";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
    // turbopack: {},
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${ASSESSMENT_SERVICE_URL}/api/:path*`,
      },
      {
        source: "/v1/:path*",
        destination: `${EXAM_ENGINE_URL}/v1/:path*`,
      },
      {
        source: "/student-api/:path*",
        destination: `${STUDENT_SERVICE_URL}/:path*`,
      },
      {
        source: "/auth-api/:path*",
        destination: `${AUTH_SERVICE_URL}/:path*`,
      },
      {
        source: "/admin-api/:path*",
        destination: `${ADMIN_API_BASE_URL}/:path*`,
      },
      {
        source: "/judge0-api/:path*",
        destination: `${JUDGE0_URL}/:path*`, // Judge0 Execution Engine
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        { message: /Failed to proxy/ },
        { message: /ECONNREFUSED/ },
      ];
    }
    return config;
  },
};

export default nextConfig;
