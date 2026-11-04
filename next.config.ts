import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1440],
    imageSizes: [96, 160, 240, 320],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
