import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  turbopack: { root: path.resolve(__dirname) },
  // API requests always go through authenticated Route Handlers.
};

export default nextConfig;
