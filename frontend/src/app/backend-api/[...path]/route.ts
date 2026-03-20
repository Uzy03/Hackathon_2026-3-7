import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

type HandlerParams = {
  path: string[];
};

type HandlerContext = {
  params: Promise<HandlerParams>;
};

const getBackendBaseUrl = (): string => {
  const raw = (process.env.BACKEND_URL || '').trim();
  if (raw) return raw.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:8000';
  throw new Error('BACKEND_URL is not set.');
};

const buildUpstreamUrl = (request: NextRequest, pathSegments: string[]): string => {
  const baseUrl = getBackendBaseUrl();
  const joinedPath = pathSegments.join('/');
  const search = request.nextUrl.search;
  return `${baseUrl}/api/${joinedPath}${search}`;
};

const proxy = async (request: NextRequest, context: HandlerContext): Promise<Response> => {
  const params = await context.params;
  const pathSegments = params.path;
  let upstreamUrl = '';
  try {
    upstreamUrl = buildUpstreamUrl(request, pathSegments);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }

  const method = request.method.toUpperCase();
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host') return;
    headers.set(key, value);
  });

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
};

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;

