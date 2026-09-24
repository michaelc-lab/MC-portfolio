import { useState, useEffect } from 'react'

export function useDevice() {
  const getDevice = () => {
    const w = window.innerWidth
    if (w < 768) return 'mobile'
    if (w < 1024) return 'tablet'
    return 'desktop'
  }

  const [device, setDevice] = useState(getDevice)

  useEffect(() => {
    const handler = () => setDevice(getDevice())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return {
    device,
    isMobile:  device === 'mobile',
    isTablet:  device === 'tablet',
    isDesktop: device === 'desktop',
    isSmall:   device !== 'desktop',
  }
}
