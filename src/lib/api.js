// One place for the backend address and the request helper (it used to be copied into four files,
// each with a different timeout — the Lead tab gave up after 20 s, which is how "Timeout" errors appeared).
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAMBD9kEsyl2RR9DJFFCcoGMoFksHt3YLcsVfFfH4FVEIbM9E0FrZSR2fg-8O97Tz8Gw/exec'

// ── Owner key ─────────────────────────────────────────────────
// Your private key (created once in Apps Script by setupOwnerKey). Kept in this browser only and sent with every
// request to your backend — without it, My Portfolios, the AI summary and Radar ratings answer "locked".
const KEY_STORE = 'mc_owner_key'
export function getOwnerKey() { try { return localStorage.getItem(KEY_STORE) || '' } catch { return '' } }
export function setOwnerKey(k) {
  const v = String(k || '').trim()
  try { if (v) localStorage.setItem(KEY_STORE, v); else localStorage.removeItem(KEY_STORE) } catch {}
  return v
}
export const isLocked = d => !!(d && d.locked)
function withKey(url) {
  const k = getOwnerKey()
  return k && url.startsWith(APPS_SCRIPT_URL) ? url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(k) : url
}

// Links that come from outside (news, filings) open only if they are ordinary web links
export const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null)

export function jsonpOnce(url, timeoutMs = 30000) {
  url = withKey(url)
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout')) }, timeoutMs)
    function cleanup() { clearTimeout(timeout); window[cbName] = () => {}; if (script.parentNode) script.parentNode.removeChild(script) }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('Script load failed')) }
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}

// Apps Script can take 20–30 s to wake up: a slow first answer is retried once with a longer wait, not reported as an error.
export async function jsonp(url, { timeout = 30000, retryTimeout = 45000 } = {}) {
  try { return await jsonpOnce(url, timeout) } catch (e) { return await jsonpOnce(url, retryTimeout) }
}

// ── Important S&P 500 news ────────────────────────────────────
// Built every 30 minutes on GitHub from several sources and kept by the MC News worker (public S&P 500 news only —
// nothing about your holdings travels there; the "My stocks" filter happens here in your browser).
export const NEWS_URL = 'https://mc-news.mikycohen1.workers.dev/news'
let NEWS_P = null, NEWS_AT = 0
export function fetchNews(force = false) {
  if (!force && NEWS_P && Date.now() - NEWS_AT < 5 * 60e3) return NEWS_P
  NEWS_AT = Date.now()
  NEWS_P = fetch(NEWS_URL, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error('News unavailable (HTTP ' + r.status + ')'); return r.json() })
    .catch(e => { NEWS_P = null; throw e })
  return NEWS_P
}
// "Nvidia shares fall - Reuters" → "Nvidia shares fall" (the source is shown separately)
export const stripSource = (headline, source) => {
  let h = String(headline || '').trim()
  if (source) h = h.replace(new RegExp('\\s*[-–—|]\\s*' + source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '')
  return h
}
export function resetNewsCache() { NEWS_P = null; NEWS_AT = 0 }   // tests; and the dashboard's manual refresh
