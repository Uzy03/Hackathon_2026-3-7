import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Turbopackのルート警告を解消
  // frontendディレクトリをルートとして認識させる
  experimental: {
    // turbo オプションは Next.js 16.1.6 (Turbopack) ではまだサポートされていないか、
    // バージョンによっては無効なキーと判定されるため、一旦コメントアウトします。
    // turbo: {
    //   root: '.',
    // },
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
