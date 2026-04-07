import pako from 'pako'

interface ShareData {
  e: string   // explain output
  q?: string  // query
  d?: string  // ddl
  t?: string  // title
}

export function encodeToUrl(explain: string, query?: string, ddl?: string, title?: string): string {
  const data: ShareData = { e: explain }
  if (query?.trim()) data.q = query
  if (ddl?.trim()) data.d = ddl
  if (title?.trim()) data.t = title

  const json = JSON.stringify(data)
  const compressed = pako.deflate(new TextEncoder().encode(json))
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return base64
}

export function decodeFromUrl(hash: string): ShareData | null {
  try {
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64

    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const decompressed = pako.inflate(bytes)
    const json = new TextDecoder().decode(decompressed)
    return JSON.parse(json) as ShareData
  } catch {
    return null
  }
}

export function getShareUrl(explain: string, query?: string, ddl?: string, title?: string): string {
  const encoded = encodeToUrl(explain, query, ddl, title)
  const url = new URL(window.location.href)
  url.hash = `p=${encoded}`
  return url.toString()
}

export function loadFromUrl(): ShareData | null {
  const hash = window.location.hash.slice(1) // remove #
  if (!hash.startsWith('p=')) return null
  return decodeFromUrl(hash.slice(2))
}
