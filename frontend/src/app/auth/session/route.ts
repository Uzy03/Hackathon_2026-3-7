import { NextRequest } from 'next/server';
import { proxyBackend } from '@/lib/backend-proxy';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  return proxyBackend(request, { params: Promise.resolve({ path: ['me'] }) });
}
