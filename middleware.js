// Edge Middleware — runs at the CDN edge before any file is served.
//
// Default-deny: every path requires HTTP Basic Auth EXCEPT the ones listed in
// `matcher` below (setup-assistant.md, fleet-control-center.html, and the
// assets/fleet_screenshots/ folder), which stay fully public.
//
// The password is read from the SITE_PASSWORD env var (set it in the Vercel
// dashboard: Settings -> Environment Variables). Username is "admin".

export const config = {
  // Match everything EXCEPT the public paths, favicon, and Vercel internals.
  matcher: ['/((?!setup-assistant\\.md|fleet-control-center\\.html|assets/fleet_screenshots/|favicon\\.ico|_vercel).*)'],
}

export default function middleware(request) {
  const expected = 'Basic ' + btoa('admin:' + (process.env.SITE_PASSWORD || ''))
  const provided = request.headers.get('authorization')

  if (provided === expected) {
    return // authorized — let the request continue to the requested file
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Private"' },
  })
}
