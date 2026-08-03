import { useEffect, useRef } from 'react'
import {
  PLATFORM_LABELS,
  PLATFORM_PLACEHOLDERS,
  normalizeHandle,
} from '../lib/socialHandles.js'

// Labelled inputs for a set of social platforms, normalizing on blur so a
// pasted profile URL settles to the bare handle the API stores.
//
// Controlled by the parent: `values` maps platform -> raw string, `errors` maps
// platform -> inline message. The parent keeps both so it can gate submission
// on `errors` being empty.
export function SocialHandleFields({
  platforms,
  values,
  errors,
  onChange,
  onErrorChange,
  idPrefix = 'social',
  autoFocusFirst = false,
}) {
  // Move focus into the first field when the group opens in a dialog, so
  // keyboard and screen-reader users land inside it rather than behind it.
  const firstInputRef = useRef(null)
  useEffect(() => {
    if (autoFocusFirst) firstInputRef.current?.focus()
  }, [autoFocusFirst])

  const handleBlur = (platform) => {
    const { value, error } = normalizeHandle(platform, values[platform] ?? '')
    // Write back the normalized handle so what's saved is what's shown.
    onChange(platform, value)
    onErrorChange(platform, error)
  }

  return (
    <div className="flex flex-col gap-4">
      {platforms.map((platform, i) => {
        const id = `${idPrefix}-${platform}`
        const error = errors[platform]
        return (
          <div key={platform}>
            <label
              htmlFor={id}
              className="font-body text-[13px] font-semibold text-cirkle-text-light"
            >
              {PLATFORM_LABELS[platform]}
            </label>
            <input
              id={id}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              ref={i === 0 ? firstInputRef : undefined}
              value={values[platform] ?? ''}
              onChange={(e) => {
                onChange(platform, e.target.value)
                if (error) onErrorChange(platform, '') // clear as they retype
              }}
              onBlur={() => handleBlur(platform)}
              placeholder={PLATFORM_PLACEHOLDERS[platform]}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`input-dark mt-1.5 ${error ? 'border-red-400' : ''}`}
            />
            {error && (
              <p id={`${id}-error`} className="mt-1.5 font-body text-[13px] text-red-400">
                {error}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SocialHandleFields
