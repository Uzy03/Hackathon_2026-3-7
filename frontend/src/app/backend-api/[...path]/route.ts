import { proxyBackend } from '@/lib/backend-proxy';
export const runtime = 'nodejs';
export const GET = proxyBackend;
export const POST = proxyBackend;
export const PATCH = proxyBackend;
