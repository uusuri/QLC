// Тип NextConfig помогает TypeScript проверять next.config.
import type { NextConfig } from "next";

const defaultBackendUrl = process.env.NODE_ENV === "production"
  ? "https://api.qlcode.me"
  : "http://127.0.0.1:8080";

const backendInternalUrl = (process.env.BACKEND_INTERNAL_URL ?? defaultBackendUrl).replace(
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
