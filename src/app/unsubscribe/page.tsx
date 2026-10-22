import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, MailX } from 'lucide-react'

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false } }

export default function UnsubscribePage({ searchParams }: { searchParams: { t?: string; done?: string } }) {
  const token = searchParams.t ?? ''
  const done = searchParams.done

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        {done === '1' ? (
          <>
            <CheckCircle2 size={40} className="mx-auto text-emerald-600 mb-3" />
            <h1 className="text-xl font-bold text-slate-900">You&apos;re unsubscribed</h1>
            <p className="text-sm text-slate-500 mt-2">You won&apos;t receive marketing messages from IQ MultiServices anymore. It can take up to 48 hours for messages already in transit to stop.</p>
          </>
        ) : done === '0' || !token ? (
          <>
            <MailX size={40} className="mx-auto text-slate-400 mb-3" />
            <h1 className="text-xl font-bold text-slate-900">Link not recognised</h1>
            <p className="text-sm text-slate-500 mt-2">This unsubscribe link is invalid or expired. Reply &quot;unsubscribe&quot; to any of our emails, or STOP on WhatsApp, and we&apos;ll remove you.</p>
          </>
        ) : (
          <>
            <MailX size={40} className="mx-auto text-slate-500 mb-3" />
            <h1 className="text-xl font-bold text-slate-900">Unsubscribe from IQ MultiServices</h1>
            <p className="text-sm text-slate-500 mt-2 mb-6">Choose what you&apos;d like to stop receiving.</p>
            <form method="POST" action={`/api/unsubscribe?t=${encodeURIComponent(token)}`} className="space-y-3">
              <input type="hidden" name="source" value="page" />
              <button name="scope" value="email" className="btn-primary w-full py-3 text-sm">Stop marketing emails</button>
              <button name="scope" value="all" className="btn-secondary w-full py-3 text-sm">Stop emails and WhatsApp messages</button>
            </form>
          </>
        )}
        <Link href="/" className="inline-block mt-6 text-xs text-slate-400 hover:text-slate-600">Back to website</Link>
      </div>
    </main>
  )
}
