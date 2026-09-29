// One place for the backend address and the request helper (it used to be copied into four files,
// each with a different timeout — the Lead tab gave up after 20 s, which is how "Timeout" errors appeared).
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUQqqI6PAa64xq5ZALeJSUWuy86pVtSEG6rIMhgNOQ-7XS-t7PJRRncJ1mi7OAwd0/exec'

export function jsonpOnce(url, timeoutMs = 30000) {
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
