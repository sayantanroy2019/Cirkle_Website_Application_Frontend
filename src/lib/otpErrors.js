// Failure codes returned by /auth/otp/send and /auth/otp/verify.
//
// Branch on these, never on the message text. The backend types them for
// exactly this purpose, and the status code alone is not enough: invalid_code
// arrives as 400 when the code is the wrong *shape* and 401 when it's simply
// wrong, so only the code distinguishes them reliably.
export const OtpError = {
  INVALID_PHONE: 'invalid_phone',
  INVALID_RECIPIENT: 'invalid_recipient',
  INVALID_CODE: 'invalid_code',
  RATE_LIMITED: 'rate_limited',
  NOT_CONFIGURED: 'not_configured',
  TIMEOUT: 'timeout',
  PROVIDER_ERROR: 'provider_error',
}

// Our own copy rather than the server's prose — the backend's wording mentions
// the delivery channel, and the UI stays channel-neutral so flipping SMS to
// WhatsApp needs no frontend change.
const COPY = {
  [OtpError.INVALID_PHONE]: 'Enter a valid mobile number.',
  [OtpError.INVALID_RECIPIENT]: "That number isn't valid.",
  [OtpError.INVALID_CODE]: 'Wrong or expired code. Request a new one.',
  [OtpError.RATE_LIMITED]: 'Please wait a few minutes before trying again.',
  [OtpError.NOT_CONFIGURED]: 'Login is temporarily unavailable, please try again later.',
  [OtpError.TIMEOUT]: 'Something went wrong — please try again.',
  [OtpError.PROVIDER_ERROR]: 'Something went wrong — please try again.',
}

const FALLBACK = 'Something went wrong. Please try again.'

/**
 * Turns an ApiError into what the screen should do about it.
 *
 * @returns {{ code, message, isFieldError, blocksSend, retryable }}
 */
export function mapOtpError(err) {
  const code = err?.code ?? null
  return {
    code,
    message: COPY[code] ?? FALLBACK,
    // Phone-shaped problems belong under the phone input, not in a banner.
    isFieldError: code === OtpError.INVALID_PHONE || code === OtpError.INVALID_RECIPIENT,
    // A live send/resend button during a rate limit invites the user to make
    // the rate limit worse. Disable it rather than only showing text.
    blocksSend: code === OtpError.RATE_LIMITED,
    // Nothing is wrong with what they typed — keep them in place and let them
    // try again.
    retryable: code === OtpError.TIMEOUT || code === OtpError.PROVIDER_ERROR,
  }
}
