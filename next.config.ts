import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb"
    }
  },
  serverExternalPackages: ["baileys", "pino"]
};

export default nextConfig;
