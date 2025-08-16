import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/rules', '/reports', '/settings', '/onboarding']

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const path = url.pathname

  // Check if this path needs authentication
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p))
  if (!needsAuth) {
    return NextResponse.next()
  }

  // Create a response object to pass to Supabase
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Create Supabase client with middleware pattern
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to sign-in with return URL
    url.pathname = '/auth/sign-in'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (auth pages)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth|api).*)',
  ],
}