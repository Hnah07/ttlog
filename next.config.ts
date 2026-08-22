import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.129.48"],
  images: {
    localPatterns: [
      {
        pathname: "/logo-ttlog.jpg",
        search: "?v=2",
      },
    ],
  },
};

export default nextConfig;
