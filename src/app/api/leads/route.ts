import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

interface LeadBody {
  property_id?: string | null
  project_id?:  string | null
  area_id?:     string | null
  source?:      string | null
  name:         string
  email?:       string
  phone:        string
  country_code?: string
  message?:     string
  preferred_contact?: 'whatsapp' | 'phone' | 'email'
  website?:     string  // honeypot
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function POST(request: NextRequest) {
  let body: LeadBody
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Honeypot
  if (body.website && body.website.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const name  = (body.name  ?? '').trim().slice(0, 120)
  const phone = (body.phone ?? '').trim().slice(0, 30)
  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const email        = (body.email ?? '').trim().slice(0, 200) || null
  const message      = (body.message ?? '').trim().slice(0, 2000) || null
  const countryCode  = body.country_code ?? '+971'
  const channel      = body.preferred_contact ?? 'whatsapp'
  const source       = body.source ?? null

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ?? null
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null
  const referrer  = request.headers.get('referer')?.slice(0, 500) ?? null

  const supabase = createClient()
  const { data: lead, error } = await supabase.from('leads').insert({
    property_id:        body.property_id ?? null,
    project_id:         body.project_id  ?? null,
    area_id:            body.area_id     ?? null,
    source,
    name,
    email,
    phone,
    country_code:       countryCode,
    message,
    preferred_contact:  channel,
    ip_address:         ip,
    user_agent:         userAgent,
    referrer,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fire-and-forget admin notification (does not block response)
  const notifyTo = process.env.LEAD_EMAIL_TO
  if (notifyTo) {
    const fullPhone = `${countryCode} ${phone}`
    const waNum     = (countryCode + phone).replace(/\D/g, '')
    const waUrl     = `https://wa.me/${waNum}`
    const callUrl   = `tel:${countryCode}${phone}`
    const inboxUrl  = `${SITE_URL}/admin/leads`

    sendEmail({
      to: notifyTo,
      subject: `🔔 New lead — ${name} (${channel})`,
      replyTo: email ?? undefined,
      html: `
        <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <div style="background:linear-gradient(to right,#022c22,#064e3b);color:#fff;padding:20px 24px">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6ee7b7">New Lead</p>
              <h1 style="margin:6px 0 0;font-size:22px">${escapeHtml(name)}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#a7f3d0">via ${escapeHtml(source ?? 'website')}</p>
            </div>
            <div style="padding:20px 24px">
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#64748b;width:130px">Phone</td><td style="padding:6px 0"><b>${escapeHtml(fullPhone)}</b></td></tr>
                ${email   ? `<tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${escapeHtml(email)}</td></tr>` : ''}
                <tr><td style="padding:6px 0;color:#64748b">Prefers</td><td style="padding:6px 0;text-transform:capitalize">${escapeHtml(channel)}</td></tr>
                ${message ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Message</td><td style="padding:6px 0;font-style:italic;color:#475569">"${escapeHtml(message)}"</td></tr>` : ''}
              </table>
              <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
                <a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 16px;border-radius:10px">WhatsApp</a>
                <a href="${callUrl}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 16px;border-radius:10px">Call</a>
                <a href="${inboxUrl}" style="display:inline-block;background:#fff;color:#0f172a;border:1px solid #cbd5e1;text-decoration:none;font-weight:600;font-size:13px;padding:10px 16px;border-radius:10px">Open inbox</a>
              </div>
            </div>
          </div>
          <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;text-align:center">IQ MultiServices · Lead ID ${lead?.id ?? '—'}</p>
        </div>
      `,
      text:
`New lead from ${name}
Phone: ${fullPhone}${email ? `\nEmail: ${email}` : ''}
Prefers: ${channel}
Source: ${source ?? 'website'}
${message ? `\nMessage: "${message}"` : ''}

WhatsApp: ${waUrl}
Call:     ${callUrl}
Inbox:    ${inboxUrl}`,
    }).catch(() => { /* never block */ })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
