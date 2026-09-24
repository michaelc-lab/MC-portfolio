import { useState, useEffect, useCallback } from 'react'
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUQqqI6PAa64xq5ZALeJSUWuy86pVtSEG6rIMhgNOQ-7XS-t7PJRRncJ1mi7OAwd0/exec'
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout')) }, 60000)
    function cleanup() { clearTimeout(timeout); delete window[cbName]; if (script.parentNode) script.parentNode.removeChild(script) }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('Script load failed')) }
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}
export function usePortfolioData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try { const json = await jsonp(APPS_SCRIPT_URL + '?action=getAllData'); setData(json); setLastUpdated(new Date()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, lastUpdated, refresh: fetchData }
}
export function fetchWorkstationData(ticker) { return jsonp(APPS_SCRIPT_URL + '?action=getWorkstationData&ticker=' + encodeURIComponent(ticker)) }
export function fetchCompareData(tickerA, tickerB) { return jsonp(APPS_SCRIPT_URL + '?action=getCompareData&tickerA=' + encodeURIComponent(tickerA) + '&tickerB=' + encodeURIComponent(tickerB)) }
