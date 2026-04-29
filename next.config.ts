import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the site to be accessed through reverse proxy preview URLs
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
  // Vercel serverless function configuration
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
