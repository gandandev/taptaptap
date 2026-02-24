import type { RequestEvent } from '@sveltejs/kit'

export function getClientIp(event: Pick<RequestEvent, 'request' | 'getClientAddress'>) {
  const forwardedFor = event.request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(',')
    if (firstIp?.trim()) {
      return firstIp.trim()
    }
  }

  try {
    return event.getClientAddress()
  } catch {
    return 'unknown'
  }
}

export function isSameOriginMutationRequest(event: Pick<RequestEvent, 'request' | 'url'>) {
  const method = event.request.method.toUpperCase()

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true
  }

  const origin = event.request.headers.get('origin')
  const secFetchSite = event.request.headers.get('sec-fetch-site')

  if (origin && origin !== event.url.origin) {
    return false
  }

  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return false
  }

  return true
}

export function exceedsContentLength(request: Request, maxBytes: number) {
  const contentLengthHeader = request.headers.get('content-length')
  if (!contentLengthHeader) return false

  const contentLength = Number(contentLengthHeader)
  if (!Number.isFinite(contentLength)) return false

  return contentLength > maxBytes
}

export function isJsonContentType(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  return contentType.toLowerCase().startsWith('application/json')
}
