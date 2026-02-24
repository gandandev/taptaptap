import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)

  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('cross-origin-opener-policy', 'same-origin')
  response.headers.set('cross-origin-resource-policy', 'same-origin')

  if (event.url.pathname.startsWith('/teacher') || event.url.pathname.startsWith('/student/')) {
    response.headers.set('cache-control', 'no-store')
  }

  return response
}
