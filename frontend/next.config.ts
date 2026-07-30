// Тип NextConfig помогает TypeScript проверять next.config.
import type { NextConfig } from "next";

const backendInternalUrl = (process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  ""
);

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendInternalUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
