import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // foto nota dari HP bisa sampai 5 MB
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
