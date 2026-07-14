import { createContext, useContext, useState } from 'react'

const OnboardingContext = createContext(null)

const INITIAL_PROFILE = {
  firstName: '',
  lastName: '',
  day: '',
  month: '',
  year: '',
  age: null,
  gender: '',
  cityId: '',
  lifestyleTagIds: [],
  photos: [],
  email: '',
}

export function OnboardingProvider({ children }) {
  const [profile, setProfile] = useState(INITIAL_PROFILE)

  const updateProfile = (fields) => setProfile((prev) => ({ ...prev, ...fields }))

  return (
    <OnboardingContext.Provider value={{ profile, updateProfile }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}

export default OnboardingContext
