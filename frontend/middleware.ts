import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  if (
    process.env.ENABLE_BASIC_AUTH !== 'true' ||
    process.env.NODE_ENV !== 'production'
  ) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // The atob function is available in Edge runtime
    const [user, pwd] = atob(authValue).split(':');

    const validUser = process.env.BASIC_AUTH_USERNAME;
    const validPassword = process.env.BASIC_AUTH_PASSWORD;

    if (user === validUser && pwd === validPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 