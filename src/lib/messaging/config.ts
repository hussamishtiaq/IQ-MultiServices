import { DEFAULT_SEND_WINDOW, type SendWindow } from './compliance'

function num(v: string | undefined, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function messagingConfig() {
  const env = process.env
  const resendConfigured = !!env.RESEND_API_KEY && !!env.MARKETING_EMAIL_FROM
  const whatsappConfigured = !!env.WHATSAPP_ACCESS_TOKEN && !!env.WHATSAPP_PHONE_NUMBER_ID
  const window: SendWindow = {
    startHour: num(env.MESSAGING_SEND_START_HOUR, DEFAULT_SEND_WINDOW.startHour),
    endHour: num(env.MESSAGING_SEND_END_HOUR, DEFAULT_SEND_WINDOW.endHour),
    timeZone: env.MESSAGING_TIMEZONE || DEFAULT_SEND_WINDOW.timeZone,
  }
  return {
    siteUrl: env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    dryRun: env.MESSAGING_DRY_RUN === 'true',
    sendWindow: window,
    email: {
      configured: resendConfigured,
      apiKey: env.RESEND_API_KEY ?? '',
      from: env.MARKETING_EMAIL_FROM ?? '',
      replyTo: env.MARKETING_EMAIL_REPLY_TO || undefined,
      unsubscribeMailto: env.MARKETING_UNSUBSCRIBE_MAILTO || undefined,
      webhookSecret: env.RESEND_WEBHOOK_SECRET ?? '',
      maxDailyCap: num(env.EMAIL_MAX_DAILY, 2000),
      batchSize: Math.min(100, num(env.EMAIL_BATCH_SIZE, 50)),
    },
    whatsapp: {
      configured: whatsappConfigured,
      accessToken: env.WHATSAPP_ACCESS_TOKEN ?? '',
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? '',
      appSecret: env.WHATSAPP_APP_SECRET ?? '',
      verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? '',
      graphVersion: env.WHATSAPP_GRAPH_VERSION || 'v23.0',
      // Meta's starting tier is 250 unique users / rolling 24h; raise as your tier grows.
      dailyCap: num(env.WHATSAPP_DAILY_CAP, 250),
      batchSize: num(env.WHATSAPP_BATCH_SIZE, 20),
    },
    cronSecret: env.CRON_SECRET ?? '',
  }
}

export type MessagingConfig = ReturnType<typeof messagingConfig>
