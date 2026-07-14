import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const ActiveCityContext = createContext(null)

export function ActiveCityProvider({ children }) {
  const [cities, setCities] = useState([])
  const [activeCityId, setActiveCityId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Default the active browsing city to the user's onboarding city.
  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/profile/me'),
      api.get('/reference/cities', { auth: false }),
    ])
      .then(([profileRes, citiesRes]) => {
        if (!active) return
        setCities(citiesRes.cities)
        setActiveCityId(profileRes.profile.cityId ?? '')
      })
      .catch(() => {
        /* pill/switcher degrade gracefully to empty */
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const activeCity = cities.find((c) => c.id === activeCityId) ?? null
  const activeCityName = activeCity?.name ?? ''

  return (
    <ActiveCityContext.Provider
      value={{ cities, activeCityId, activeCityName, setActiveCityId, isLoading }}
    >
      {children}
    </ActiveCityContext.Provider>
  )
}

export function useActiveCity() {
  const ctx = useContext(ActiveCityContext)
  if (!ctx) throw new Error('useActiveCity must be used within ActiveCityProvider')
  return ctx
}

export default ActiveCityContext
