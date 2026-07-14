import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../../store/onboardingStore.js'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'

const CURRENT_YEAR = new Date().getFullYear()

const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
]

const YEARS = Array.from(
  { length: CURRENT_YEAR - 13 - (CURRENT_YEAR - 100) + 1 },
  (_, i) => CURRENT_YEAR - 13 - i,
)

function daysInMonth(month, year) {
  if (!month) return 31
  return new Date(year || CURRENT_YEAR, month, 0).getDate()
}

function calculateAge(day, month, year) {
  const today = new Date()
  const birth = new Date(year, month - 1, day)
  let age = today.getFullYear() - birth.getFullYear()
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hadBirthdayThisYear) age--
  return age
}

export function DobStep() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useOnboarding()

  const [day, setDay] = useState(profile.day)
  const [month, setMonth] = useState(profile.month)
  const [year, setYear] = useState(profile.year)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const maxDay = daysInMonth(Number(month), Number(year))
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)

  const isComplete = day && month && year
  const age = isComplete ? calculateAge(Number(day), Number(month), Number(year)) : null
  const isValid = isComplete

  const handleDayChange = (value) => setDay(value)
  const handleMonthChange = (value) => {
    setMonth(value)
    if (day && Number(day) > daysInMonth(Number(value), Number(year))) setDay('')
  }
  const handleYearChange = (value) => {
    setYear(value)
    if (day && Number(day) > daysInMonth(Number(month), Number(value))) setDay('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    const dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/step/2', { dateOfBirth })
      updateProfile({ day, month, year, age })
      navigate('/onboarding/gender')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  const selectClass = 'input-dark appearance-none text-center cursor-pointer'

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={2} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <h1 className="font-display text-section-lg text-white uppercase">
          When were you born?
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Only your age is shown publicly — never your birthdate.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-2">
          <select
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            className={selectClass}
            aria-label="Day"
          >
            <option value="" disabled>Day</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className={selectClass}
            aria-label="Month"
          >
            <option value="" disabled>Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className={selectClass}
            aria-label="Year"
          >
            <option value="" disabled>Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {isComplete && (
          <p className="mt-3 font-body text-[13px] text-cirkle-text-light">
            You're <span className="font-bold text-white">{age}</span> — that's what people will see.
          </p>
        )}

        {apiError && (
          <p className="mt-4 font-body text-[13px] text-red-400">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="btn-primary w-full px-8 py-3.5 mt-8 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default DobStep
