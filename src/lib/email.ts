/**
 * Minimal Resend client — sends a transactional email.
 * No-op (returns silently) if RESEND_API_KEY isn't configured.
 *
 * Get an API key at https://resend.com (free tier: 3000 emails/month).
 * Set RESEND_API_KEY, LEAD_EMAIL_TO, LEAD_EMAIL_FROM in .env.local.
 */

interface SendEmailArgs {
  to:      string | string[]
  subject: string
  html:    string
  text?:   string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.LEAD_EMAIL_FROM ?? 'IQ MultiServices <onboarding@resend.dev>'

  if (!apiKey) {
    // Silently skip in dev / when not configured
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[email] RESEND_API_KEY not set — skipping send to', to)
    }
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[email] Resend error', res.status, body)
    }
  } catch (e) {
    // Never let email failures break the API route
    console.error('[email] Send failed', e)
  }
}
