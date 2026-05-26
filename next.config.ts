import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    forceSwcTransforms: false,
    webpackBuildWorker: false,
  },
};

export default nextConfig;
