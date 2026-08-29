import { useState } from 'react'
import { X } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { useProfileStore } from '../store/profileStore.js'
import { PLATFORM_LABELS, normalizeHandle } from '../lib/socialHandles.js'
import SocialHandleFields from './SocialHandleFields.jsx'

// Joins labels for the explanatory line: "Instagram and LinkedIn",
// "Instagram, LinkedIn and Facebook".
function labelList(platforms) {
  const labels = platforms.map((p) => PLATFORM_LABELS[p])
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

/**
 * The just-in-time gate. Shown when buying or requesting an invitation returns
 * 403 social_handles_required.
 *
 * Collects only the handles named in `missing` — never re-asks for ones the
 * user already has. There is deliberately no "skip": on success it calls
 * `onSaved`, which retries the action that was blocked. Cancelling abandons
 * that action entirely.
 */
export function SocialHandlesDialog({ missing, googleFormUrl = null, onCancel, onSaved }) {
  const applyProfileUpdate = useProfileStore((s) => s.applyUpdate)

  const [values, setValues] = useState(() =>
    Object.fromEntries(missing.map((p) => [p, ''])),
  )
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  // The app cannot verify a Google Form submission — the checkbox is the
  // user's word, and the organizer cross-checks responses before accepting.
  const [formConfirmed, setFormConfirmed] = useState(false)

  const setValue = (platform, value) => {
    setValues((prev) => ({ ...prev, [platform]: value }))
    setApiError('')
  }
  const setError = (platform, error) =>
    setErrors((prev) => ({ ...prev, [platform]: error }))

  // Hard gate: every missing handle must be filled, with no inline errors —
  // and when the organizer attached a form, its confirmation box too.
  const allFilled = missing.every((p) => (values[p] ?? '').trim() !== '')
  const noErrors = missing.every((p) => !errors[p])
  const canSubmit = allFilled && noErrors && !isSaving && (!googleFormUrl || formConfirmed)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    // Normalize once more here — the user may hit Continue without ever
    // blurring the last field.
    const payload = {}
    const nextErrors = {}
    let hasError = false
    for (const platform of missing) {
      const { value, error } = normalizeHandle(platform, values[platform])
      if (error || !value) {
        nextErrors[platform] =
          error || `Add your ${PLATFORM_LABELS[platform]} handle to continue.`
        hasError = true
      } else {
        payload[platform] = value
      }
    }
    if (hasError) {
      setErrors(nextErrors)
      setValues((prev) => ({ ...prev, ...payload }))
      return
    }

    setIsSaving(true)
    setApiError('')
    try {
      // A form-only gate (missing = []) has no profile change to save.
      if (Object.keys(payload).length > 0) {
        await api.patch('/profile/me', payload)
        // PATCH returns no body — merge locally so the gate sees the new handles.
        applyProfileUpdate(payload)
      }
      await onSaved()
    } catch (err) {
      setApiError(
        err instanceof ApiError ? err.message : 'Could not save. Please try again.',
      )
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-gate-title"
    >
      <div className="w-full sm:max-w-[420px] bg-cirkle-card border border-cirkle-border-card rounded-t-[20px] sm:rounded-[20px] p-6 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="social-gate-title"
            className="font-body text-[20px] font-bold text-white leading-snug"
          >
            {missing.length > 0
              ? `Add your ${labelList(missing)}`
              : 'A few questions first'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-8 h-8 -mr-1 -mt-1 flex-shrink-0 flex items-center justify-center rounded-full text-cirkle-text-muted transition-all duration-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Cancel"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {missing.length > 0 && (
          <p className="mt-2 font-body text-[14px] text-cirkle-text-muted leading-relaxed">
            This event requires you to add your {labelList(missing)} to attend.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5">
          {missing.length > 0 && (
            <SocialHandleFields
              platforms={missing}
              values={values}
              errors={errors}
              onChange={setValue}
              onErrorChange={setError}
              idPrefix="gate"
              autoFocusFirst
            />
          )}

          {googleFormUrl && (
            <div className={missing.length > 0 ? 'mt-6' : ''}>
              <p className="font-body text-[14px] text-cirkle-text-muted leading-relaxed">
                The organizer has a few extra questions for this event. Fill out
                their form — they review answers before accepting requests.
              </p>
              <a
                href={googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full rounded-full border border-cirkle-border-card px-8 py-3 text-center font-body text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-white/10"
              >
                Open the form
              </a>
              <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formConfirmed}
                  onChange={(e) => setFormConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-cirkle-yellow"
                />
                <span className="font-body text-[14px] text-white">
                  I've filled out the form
                </span>
              </label>
            </div>
          )}

          {apiError && (
            <p className="mt-4 font-body text-[13px] text-red-400">{apiError}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary w-full px-8 py-3.5 mt-6 disabled:opacity-40 disabled:pointer-events-none"
          >
            {missing.length > 0
              ? isSaving ? 'Saving…' : 'Save and continue'
              : isSaving ? 'Sending…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full mt-3 py-2 font-body text-[14px] font-semibold text-cirkle-text-muted transition-colors duration-200 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}

export default SocialHandlesDialog
