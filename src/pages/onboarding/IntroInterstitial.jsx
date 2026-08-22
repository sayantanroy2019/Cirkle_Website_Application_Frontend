import { useState } from 'react'

// Hinge-style onboarding interstitial: full-bleed photo, one calm statement of
// intent, a single Continue. No fields, no selling. The photo carries the mood;
// the copy explains why the next step exists; the button is the only exit.
//
// The photo lives at public/onboarding/intro.jpg (licensed stock — Unsplash,
// free for commercial use, same pattern as the walkthrough's photo slot). If
// it's missing or fails to load, the page falls back to a composed gradient
// with a soft yellow glow, so it degrades to "designed", never "broken".
export function IntroInterstitial({
  headline,
  body,
  ctaLabel = 'Continue',
  onContinue,
  photo = '/onboarding/intro.jpg',
}) {
  const [photoOk, setPhotoOk] = useState(true)

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-cirkle-black">
      {/* Fallback composition — always painted, revealed if the photo dies. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 30%, rgba(231,234,74,0.14) 0%, rgba(6,6,6,0) 55%), linear-gradient(180deg, #1A1A1A 0%, #060606 70%)',
        }}
        aria-hidden="true"
      />

      {photoOk && (
        <img
          key={photo} // a new photo restarts both the error state's img and the settle animation
          src={photo}
          alt=""
          onError={() => setPhotoOk(false)}
          className="absolute inset-0 w-full h-full object-cover animate-[slowSettle_9s_ease-out_forwards]"
          aria-hidden="true"
        />
      )}

      {/* Legibility gradient — same trick as the reference: the photo runs
          full-bleed and the lower third melts into the page background so the
          type sits on near-black, not on faces. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-cirkle-black via-cirkle-black/80 to-transparent"
        aria-hidden="true"
      />
      {/* Whisper of darkening at the very top so the status bar stays readable. */}
      <div
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent"
        aria-hidden="true"
      />

      {/* Copy block — anchored to the bottom, one screen, no scroll. */}
      <div className="absolute inset-x-0 bottom-0 px-7 pb-[calc(env(safe-area-inset-bottom,0px)+28px)]">
        <div className="max-w-[420px] mx-auto">
          <span
            className="opacity-0 animate-[fadeUp_0.6s_ease_forwards] block w-10 h-[3px] rounded-full bg-cirkle-yellow"
            aria-hidden="true"
          />

          <h1
            className={`opacity-0 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:0.15s] mt-5 font-display leading-[0.94] tracking-[-0.01em] text-white uppercase text-balance ${
              // Long headlines step down a size instead of clipping or
              // wrapping into a wall — the poster look only works when the
              // whole line breathes.
              headline.length > 28
                ? 'text-[clamp(32px,8.5vw,44px)]'
                : 'text-[clamp(42px,11.5vw,58px)]'
            }`}
          >
            {headline}
          </h1>

          <p className="opacity-0 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:0.3s] mt-4 font-body text-[15.5px] leading-relaxed text-cirkle-text-light max-w-[34ch]">
            {body}
          </p>

          {/* Compact centered pill, sized like the reference interstitial —
              a quiet "next", not a full-width slab demanding action. */}
          <div className="opacity-0 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:0.45s] mt-9 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="btn-primary min-w-[180px] px-12 py-[10px] text-[15px]"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntroInterstitial
