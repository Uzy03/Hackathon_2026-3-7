import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR || ".next"; // admin/client 同時起動のためにビルド出力先を分けられるようにする

const isProduction = process.env.NODE_ENV === "production"; // Vercel 本番ビルドかどうかを NODE_ENV で判定する
const backendUrlFromEnv = process.env.BACKEND_URL || ""; // 本番環境では Render の Backend URL を環境変数から受け取る
const backendBaseUrl = isProduction && backendUrlFromEnv ? backendUrlFromEnv : "http://localhost:8000"; // 本番は BACKEND_URL、開発は localhost を使う
const normalizedBackendBaseUrl = backendBaseUrl.replace(/\/$/, ""); // 末尾スラッシュ有無で URL 結合が壊れないよう正規化する

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  distDir,
  devIndicators: false,
  
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
        destination: `${normalizedBackendBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
