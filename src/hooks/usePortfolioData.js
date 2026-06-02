import { useState, useEffect, useCallback } from 'react'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznax24d_H7JzF7j4Sp_FLV_yI8qJIiRjsEZq7IwJFJM4lVYqLub9TeKScLO3c5A4Y/exec'

export function usePortfolioData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getAllData&cb=${Date.now()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
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

export async function fetchWorkstationData(ticker) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getWorkstationData&ticker=${encodeURIComponent(ticker)}&cb=${Date.now()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchCompareData(tickerA, tickerB) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getCompareData&tickerA=${encodeURIComponent(tickerA)}&tickerB=${encodeURIComponent(tickerB)}&cb=${Date.now()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchMyTickers() {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getMyTickers&cb=${Date.now()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
