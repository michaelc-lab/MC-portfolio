import { useState, useEffect, useCallback } from 'react'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznax24d_H7JzF7j4Sp_FLV_yI8qJIiRjsEZq7IwJFJM4lVYqLub9TeKScLO3c5A4Y/exec'

// JSONP fetch — bypasses CORS for Apps Script
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Request timed out'))
    }, 60000)

    function cleanup() {
      clearTimeout(timeout)
      delete window[cbName]
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    window[cbName] = (data) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('Script load failed'))
    }

    const sep = url.includes('?') ? '&' : '?'
    script.src = url + sep + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}

export function usePortfolioData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json = await jsonp(`${APPS_SCRIPT_URL}?action=getAllData`)
      setData(json)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, lastUpdated, refresh: fetchData }
}

export function fetchWorkstationData(ticker) {
  return jsonp(`${APPS_SCRIPT_URL}?action=getWorkstationData&ticker=${encodeURIComponent(ticker)}`)
}

export function fetchCompareData(tickerA, tickerB) {
  return jsonp(`${APPS_SCRIPT_URL}?action=getCompareData&tickerA=${encodeURIComponent(tickerA)}&tickerB=${encodeURIComponent(tickerB)}`)
}

export function fetchMyTickers() {
  return jsonp(`${APPS_SCRIPT_URL}?action=getMyTickers`)
}
