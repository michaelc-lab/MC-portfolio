export const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: d })
  return Number(n).toFixed(d)
}

export const fmtPrice = (n) => {
  if (n == null || isNaN(n)) return '—'
  const d = n < 10 ? 3 : n < 100 ? 2 : n < 10000 ? 2 : 0
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}

export const fmtPct = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—'
  return (n > 0 ? '+' : '') + n.toFixed(d) + '%'
}

export const fmtLarge = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(2)
}

export const pctClass = (n) => {
  if (n == null) return 'neutral'
  if (n > 0) return 'positive'
  if (n < 0) return 'negative'
  return 'neutral'
}

export const statusBadgeClass = (s) => {
  switch (s) {
    case 'ATH': return 'badge-ath'
    case 'UP': return 'badge-up'
    case 'DOWN': return 'badge-down'
    default: return 'badge-flat'
  }
}

export const ddClass = (dd) => {
  if (dd == null) return 'neutral'
  if (dd >= -0.5) return 'positive'
  if (dd >= -20) return 'accent'
  if (dd >= -50) return 'text-yellow-500'
  return 'negative'
}

export const sortRows = (rows, key, dir) => {
  const numKeys = ['price', 'ath', 'dd', 'dayChangePct', 'weekChangePct']
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    let av = a[key], bv = b[key]
    if (numKeys.includes(key)) {
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return (av - bv) * sign
    }
    av = (av || '').toString().toLowerCase()
    bv = (bv || '').toString().toLowerCase()
    return av.localeCompare(bv) * sign
  })
}

export const filterRows = (rows, { q, sector, status }, hasThesis = false) => {
  const query = (q || '').toLowerCase().trim()
  return rows.filter(r => {
    if (sector && r.sector !== sector) return false
    if (status && r.status !== status) return false
    if (query) {
      let hay = `${r.ticker} ${r.company} ${r.sector}`.toLowerCase()
      if (hasThesis && r.thesis) hay += ' ' + r.thesis.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

export const formatTime = (date) => {
  if (!date) return '—'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
