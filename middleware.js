// Edge Middleware — runs at the CDN edge before any file is served.
//
// Default-deny: every path requires HTTP Basic Auth EXCEPT the ones listed in
// `matcher` below (setup-assistant.md, fleet-control-centre.html, and the
// assets/fleet_screenshots/ folder), which stay fully public.
//
// The password is read from the SITE_PASSWORD env var (set it in the Vercel
// dashboard: Settings -> Environment Variables). Username is "admin".

export const config = {
  // Match everything EXCEPT the public paths, favicon, and Vercel internals.
  matcher: ['/((?!setup-assistant\\.md$|fleet-control-centre\\.html$|assets/fleet_screenshots/|favicon\\.ico$|_vercel(?:$|/)).*)'],
}

export default function middleware(request) {
  // Font hotlink guard (defense-in-depth for the licensed Even Signature face).
  // Block cross-site requests for font files so another domain can't embed or
  // hotlink the WOFF2. Same-origin page loads and direct navigation still pass;
  // Basic Auth below is the primary gate.
  const path = new URL(request.url).pathname
  if (/\.(woff2?|otf|ttf)$/i.test(path) &&
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return new Response('Forbidden', { status: 403 })
  }

  // Fail closed: if no password is configured, refuse everything rather than
  // accepting an empty-password credential (admin: with a blank password).
  const password = process.env.SITE_PASSWORD
  if (!password) {
    return new Response('Site auth not configured', { status: 503 })
  }

  const expected = 'Basic ' + btoa('admin:' + password)
  const provided = request.headers.get('authorization')

  if (provided === expected) {
    return // authorized — let the request continue to the requested file
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Private"' },
  })
}
