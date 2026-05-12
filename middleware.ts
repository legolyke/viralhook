import { NextResponse, type NextRequest } from 'next/server'

const PROJECT_REF = 'qkkltpkbfsotgxcgkbme'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasSession =
    request.cookies.has(`sb-${PROJECT_REF}-auth-token`) ||
    request.cookies.has(`sb-${PROJECT_REF}-auth-token.0`)

  if (!hasSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
