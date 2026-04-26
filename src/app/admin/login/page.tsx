'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const FEATURES = [
  'Full property listing management',
  'Business services showcase',
  'Contact & social media hub',
]

export default function AdminLoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branded panel ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 relative overflow-hidden flex-col p-12">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Glow blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-auto">
          {/* Logo placeholder — replace with your logo image */}
          <div className="w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Building2 size={22} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">IQ MultiServices</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10 mb-10">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Premium Properties,<br />
            <span className="text-emerald-300">Professional Services.</span>
          </h2>
          <p className="mt-4 text-emerald-200 text-base leading-relaxed max-w-sm">
            Manage your listings, services, and contacts from a single, secure admin panel.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3 mb-12">
          {FEATURES.map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 size={17} className="text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-100 text-sm">{f}</span>
            </div>
          ))}
        </div>

        {/* TLS badge */}
        <div className="relative z-10 inline-flex items-center gap-2.5 bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-emerald-100 text-sm w-fit">
          <Shield size={16} className="text-emerald-300" />
          Protected by TLS encryption.
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-emerald-800 rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">IQ MultiServices</span>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sign In</p>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 mb-8 text-sm">Sign in to your admin panel.</p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              <span className="w-5 h-5 rounded-full border-2 border-red-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email or Username</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="input-icon" placeholder="admin@example.com" />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input-icon pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 text-base mt-2">
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Signing in…</>
                : 'Sign in to IQ MultiServices →'}
            </button>

            <p className="text-center text-xs text-slate-400 pt-1">
              Protected by TLS encryption
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
