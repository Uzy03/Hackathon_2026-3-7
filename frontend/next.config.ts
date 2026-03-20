import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR || ".next"; // admin/client 同時起動のためにビルド出力先を分けられるようにする

const isProduction = process.env.NODE_ENV === "production"; // Vercel 本番ビルドかどうかを NODE_ENV で判定する
const isVercelBuild = process.env.VERCEL === "1"; // Vercel 環境では localhost への rewrite が私用ネットワーク扱いになり失敗するため判定する
const backendUrlFromEnv = (process.env.BACKEND_URL || "").trim(); // 本番環境では Render の Backend URL を環境変数から受け取る
if (isProduction && isVercelBuild && !backendUrlFromEnv) { // Vercel の本番ビルドで BACKEND_URL 未設定だと /api/* が 404 になるためビルド時に止める
  throw new Error("BACKEND_URL is required on Vercel production builds."); // 運用ミスを即座に検知できるよう例外で失敗させる
}
const backendBaseUrl = isProduction && backendUrlFromEnv ? backendUrlFromEnv : "http://localhost:8000"; // 本番は BACKEND_URL、開発は localhost を使う
const normalizedBackendBaseUrl = backendBaseUrl.replace(/\/$/, ""); // 末尾スラッシュ有無で URL 結合が壊れないよう正規化する
console.log( // Vercel のビルドログで rewrites の転送先を確認できるように出力する
  "[next.config] rewrites backendBaseUrl=%s normalized=%s NODE_ENV=%s BACKEND_URL=%s", // URL の二重スラッシュ等の事故を可視化する
  backendBaseUrl, // 生の転送先 URL（本番は BACKEND_URL、開発は localhost）を出力する
  normalizedBackendBaseUrl, // 正規化後 URL（末尾スラッシュ除去）を出力する
  process.env.NODE_ENV || "", // Vercel 側の NODE_ENV を出力する
  backendUrlFromEnv || "", // 本番用の BACKEND_URL が入っているかを確認できるように出力する
); // console.log をここで閉じる

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
