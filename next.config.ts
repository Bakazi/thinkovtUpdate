import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the site to be accessed through reverse proxy preview URLs
  // This prevents CORS and origin mismatches when behind Caddy
  allowedDevOrigins: [
    "https://preview-chat-*.space.z.ai",
  ],
  // Images - allow external domains if needed
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
