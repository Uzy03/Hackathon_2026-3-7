import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/', '/admin/:path*', '/client/:path*'],
};

export default function middleware(request: NextRequest) {
  const mode = process.env.NEXT_PUBLIC_APP_MODE;
  if (mode !== 'admin' && mode !== 'client') return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  if (mode === 'admin') {
    if (pathname === '/' || pathname.startsWith('/client')) {
      url.pathname = '/admin';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === '/' || pathname.startsWith('/admin')) {
    url.pathname = '/client';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

