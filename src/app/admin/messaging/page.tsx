import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Circle, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { messagingConfig } from '@/lib/messaging/config'
import { emailDailyCap, healthBreaker, isWithinSendWindow, type ChannelHealth } from '@/lib/messaging/compliance'
import { DispatchButton } from './ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Messaging | IQ Admin' }

function pct(n: number, d: number) { return d ? `${((n / d) * 100).toFixed(2)}%` : '—' }

export default async function MessagingOverview() {
  const cfg = messagingConfig()
  const supabase = await createClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()

  const [health, emailSent, waSent, firstEmail, sending, paused, suppressed, inbound, consent] = await Promise.all([
    supabase.from('v_channel_health_7d').select('*'),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('channel', 'email').eq('direction', 'outbound').gte('sent_at', since),
    supabase.rpc('whatsapp_unique_recipients_since', { since }),
    supabase.from('messages').select('sent_at').eq('channel', 'email').eq('direction', 'outbound').not('sent_at', 'is', null).order('sent_at').limit(1),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'sending'),
    supabase.from('campaigns').select('id, name, pause_reason').eq('status', 'paused'),
    supabase.from('suppressions').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'inbound').gte('created_at', since),
    supabase.from('audience_contacts').select('id', { count: 'exact', head: true }),
  ])
  const [emailOk, waOk] = await Promise.all([
    supabase.from('audience_contacts').select('id', { count: 'exact', head: true }).in('email_consent', ['opted_in', 'implied']),
    supabase.from('audience_contacts').select('id', { count: 'exact', head: true }).eq('whatsapp_consent', 'opted_in'),
  ])

  const tableMissing = !!health.error && /does not exist|schema cache/i.test(health.error.message)
  const h = new Map(((health.data ?? []) as Array<ChannelHealth & { channel: string }>).map(r => [r.channel, r]))
  const emailH = h.get('email') ?? { attempted: 0, bounced: 0, complained: 0, failed: 0 }
  const waH = h.get('whatsapp') ?? { attempted: 0, bounced: 0, complained: 0, failed: 0 }
  const emailCap = emailDailyCap(firstEmail.data?.[0]?.sent_at ?? null, new Date(), cfg.email.maxDailyCap)
  const waUnique = (waSent.data as number | null) ?? 0
  const emailMarketable = emailOk.count ?? 0
  const waMarketable = waOk.count ?? 0
  const inWindow = isWithinSendWindow(new Date(), cfg.sendWindow)

  const checklist = [
    { ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY, label: 'SUPABASE_SERVICE_ROLE_KEY set (webhooks, cron, unsubscribe)' },
    { ok: cfg.email.configured, label: 'Resend: RESEND_API_KEY + MARKETING_EMAIL_FROM (verified domain with SPF, DKIM, DMARC)' },
    { ok: !!cfg.email.webhookSecret, label: 'Resend webhook → /api/webhooks/resend (RESEND_WEBHOOK_SECRET) for replies, bounces, complaints' },
    { ok: cfg.whatsapp.configured, label: 'WhatsApp Cloud API: WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID' },
    { ok: !!cfg.whatsapp.appSecret && !!cfg.whatsapp.verifyToken, label: 'WhatsApp webhook → /api/webhooks/whatsapp (WHATSAPP_APP_SECRET + WHATSAPP_VERIFY_TOKEN)' },
    { ok: !!cfg.cronSecret, label: 'CRON_SECRET set so the scheduler can call /api/messaging/dispatch' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messaging</h1>
          <p className="text-slate-500 text-sm mt-1">
            Compliant bulk email and WhatsApp, with two-way replies.{' '}
            {cfg.dryRun && <span className="font-semibold text-amber-700">DRY RUN mode: nothing is actually sent.</span>}
          </p>
        </div>
        <DispatchButton />
      </div>

      {tableMissing && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          Run <code>supabase/migrations/0011_messaging.sql</code> in the Supabase SQL editor to create the messaging tables.
        </div>
      )}

      {(paused.data ?? []).map(p => (
        <div key={p.id} className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span><b>{p.name}</b> is paused: {p.pause_reason}. Review it before resuming in{' '}
            <Link href={`/admin/messaging/campaigns/${p.id}`} className="underline">Campaigns</Link>.</span>
        </div>
      ))}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {([
          { icon: Mail, title: 'Email', sent: emailSent.count ?? 0, cap: emailCap, capNote: 'warm-up schedule',
            rows: [['Bounce rate (7d)', pct(emailH.bounced, emailH.attempted), 'keep < 2%'], ['Spam complaints (7d)', pct(emailH.complained, emailH.attempted), 'keep < 0.1%'], ['Can receive marketing', String(emailMarketable), 'opted-in + existing relationship']],
            breaker: healthBreaker('email', emailH) },
          { icon: MessageCircle, title: 'WhatsApp', sent: waUnique, cap: cfg.whatsapp.dailyCap, capNote: 'Meta tier, unique users',
            rows: [['Failure rate (7d)', pct(waH.failed, waH.attempted), 'keep < 10%'], ['Can receive marketing', String(waMarketable), 'explicit opt-in only'], ['Free-form replies', '24h window', 'templates outside it']],
            breaker: healthBreaker('whatsapp', waH) },
        ] as const).map(c => (
          <div key={c.title} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <c.icon size={18} className="text-emerald-700" />
              <h2 className="font-semibold text-slate-900">{c.title}</h2>
              {c.breaker
                ? <span className="ml-auto text-xs font-semibold text-red-700">Health check failing</span>
                : <span className="ml-auto text-xs font-semibold text-emerald-700">Healthy</span>}
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Last 24h: {c.sent} / {c.cap}</span><span>{c.capNote}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, (c.sent / Math.max(1, c.cap)) * 100)}%` }} />
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {c.rows.map(([k, v, hint]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{k} <span className="text-[11px] text-slate-400">({hint})</span></dt>
                  <dd className="font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            {c.breaker && <p className="mt-3 text-xs text-red-700">{c.breaker}. Campaigns on this channel pause automatically.</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Campaigns sending', sending.count ?? 0, '/admin/messaging/campaigns'],
          ['Replies (24h)', inbound.count ?? 0, '/admin/messaging/inbox'],
          ['Audience', consent.count ?? 0, '/admin/messaging/contacts'],
          ['Suppressed addresses', suppressed.count ?? 0, '/admin/messaging/contacts?view=suppressed'],
        ].map(([label, value, href]) => (
          <Link key={label as string} href={href as string} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-emerald-200">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Setup checklist</h2>
          <ul className="space-y-2">
            {checklist.map(i => (
              <li key={i.label} className="flex items-start gap-2 text-sm">
                {i.ok ? <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" /> : <Circle size={16} className="text-slate-300 mt-0.5 flex-shrink-0" />}
                <span className={i.ok ? 'text-slate-700' : 'text-slate-500'}>{i.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-700" /> Rules enforced automatically</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Marketing goes only to contacts with consent. Cold lists are blocked.</li>
            <li>Every send re-checks the suppression list (unsubscribes, STOP, bounces, complaints).</li>
            <li>Marketing is sent only between {cfg.sendWindow.startHour}:00 and {cfg.sendWindow.endHour}:00 ({cfg.sendWindow.timeZone}). It&apos;s {inWindow ? 'inside' : 'outside'} that window now.</li>
            <li>Daily volume ramps up gradually (email warm-up) and stays within your WhatsApp tier.</li>
            <li>Campaigns auto-pause if bounces, complaints or WhatsApp failures spike, or Meta flags your number.</li>
            <li>Emails carry one-click unsubscribe headers, an unsubscribe link and your postal address.</li>
            <li>WhatsApp free text only inside the 24h reply window. Approved templates otherwise.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
