import { NextRequest } from 'next/server'; // Route Handler でリクエスト情報を扱うために NextRequest を使う

export const runtime = 'nodejs'; // 外部 API へのプロキシを安定させるため Node.js ランタイムで実行する

type HandlerParams = { // 動的ルートの params を型で固定して any を避ける
  path: string[]; // /api/* の残りパスを配列として受け取る
}; // 型定義をここで閉じる

type HandlerContext = { // Route Handler の context 型を Next.js の期待形に合わせる
  params: Promise<HandlerParams>; // Next.js 16 系では params が Promise で渡されるため型を合わせる
}; // 型定義をここで閉じる

const getBackendBaseUrl = (): string => { // Backend のベースURLを環境変数から決定する
  const raw = (process.env.BACKEND_URL || '').trim(); // 本番は Vercel の環境変数 BACKEND_URL を読む
  if (raw) return raw.replace(/\/$/, ''); // 末尾スラッシュを除去して二重スラッシュを防ぐ
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:8000'; // 開発時はローカル Backend を既定にする
  throw new Error('BACKEND_URL is not set.'); // 本番で未設定ならプロキシ不能なので例外にする
}; // 関数定義をここで閉じる

const buildUpstreamUrl = (request: NextRequest, pathSegments: string[]): string => { // 転送先URLを組み立てる
  const baseUrl = getBackendBaseUrl(); // 転送先のベースURLを取得する
  const joinedPath = pathSegments.join('/'); // /api 配下の残りパスを結合する
  const search = request.nextUrl.search; // クエリ文字列をそのまま転送する
  return `${baseUrl}/api/${joinedPath}${search}`; // FastAPI 側の /api/* に合わせて組み立てる
}; // 関数定義をここで閉じる

const proxy = async (request: NextRequest, context: HandlerContext): Promise<Response> => { // 共通のプロキシ処理を実装する
  const params = await context.params; // Promise で渡される params を await して取り出す
  const pathSegments = params.path; // /api/* の残りパス配列を取得する
  let upstreamUrl = ''; // try/catch 後に参照できるよう初期化しておく
  try { // BACKEND_URL 未設定などで URL 組み立てに失敗しうるため例外を捕捉する
    upstreamUrl = buildUpstreamUrl(request, pathSegments); // 転送先URLを確定する
  } catch (err) { // 設定不足などの例外を 500 として返す
    const message = err instanceof Error ? err.message : 'Unknown error'; // 例外を文字列に落として返却する
    return Response.json({ error: message }, { status: 500 }); // フロント側で原因が分かるよう JSON で返す
  }
  const method = request.method.toUpperCase(); // HTTP メソッドを大文字で統一する
  const headers = new Headers(); // 転送用ヘッダーを新規に組み立てる

  request.headers.forEach((value, key) => { // クライアントからのヘッダーを必要最小限で転送する
    const lower = key.toLowerCase(); // 比較のため小文字化する
    if (lower === 'host') return; // host は転送先と不整合になるため除外する
    headers.set(key, value); // それ以外はそのまま転送する
  }); // forEach をここで閉じる

  const hasBody = method !== 'GET' && method !== 'HEAD'; // GET/HEAD はボディ無しとして扱う
  const body = hasBody ? await request.arrayBuffer() : undefined; // ボディはバイト列で取得してそのまま転送する

  const upstreamResponse = await fetch(upstreamUrl, { // FastAPI へリクエストを中継する
    method, // 元のメソッドをそのまま渡す
    headers, // 変換済みヘッダーを渡す
    body, // ボディがある場合のみ渡す
    redirect: 'manual', // リダイレクトは自動追従せず呼び出し側に返す
  }); // fetch 呼び出しをここで閉じる

  const responseHeaders = new Headers(upstreamResponse.headers); // 返却ヘッダーをコピーして編集可能にする
  responseHeaders.delete('content-encoding'); // 圧縮ヘッダーは環境差で不整合になりやすいので除外する
  responseHeaders.delete('transfer-encoding'); // ストリーム関連ヘッダーは Next 側で管理されるため除外する

  return new Response(upstreamResponse.body, { // 受け取ったレスポンスをそのまま返す
    status: upstreamResponse.status, // ステータスコードを維持する
    headers: responseHeaders, // 整形済みヘッダーを返す
  }); // Response 生成をここで閉じる
}; // 関数定義をここで閉じる

export const GET = proxy; // GET を Backend に中継する
export const POST = proxy; // POST を Backend に中継する
export const PATCH = proxy; // PATCH を Backend に中継する
