'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Menu, X, Phone } from 'lucide-react'

const navLinks = [
  { href: '/',           label: 'Home' },
  { href: '/properties', label: 'Properties' },
  { href: '/services',   label: 'Services' },
]

export default function Navbar() {
  const [open,    setOpen]    = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isHome   = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const transparent = isHome && !scrolled

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      transparent
        ? 'bg-transparent'
        : 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
    }`}>
      <div className="container-main">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className={`flex items-center gap-2.5 font-bold text-lg transition-colors ${
            transparent ? 'text-white' : 'text-emerald-900'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              transparent ? 'bg-white/20 border border-white/30' : 'bg-emerald-800'
            }`}>
              <Building2 size={16} className="text-white" />
            </div>
            IQ MultiServices
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? transparent ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800'
                    : transparent ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-50'
                }`}>
                {link.label}
              </Link>
            ))}
            <Link href="/contact"
              className={`ml-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                transparent
                  ? 'bg-white/15 text-white border border-white/30 hover:bg-white/25'
                  : 'bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm'
              }`}>
              <Phone size={14} /> Contact Us
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setOpen(!open)}
            className={`md:hidden p-2 rounded-xl transition-colors ${
              transparent ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
            }`}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden bg-white border-t border-slate-100 py-3 space-y-1 rounded-b-2xl shadow-lg">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-50'
                }`}>
                {link.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)}
              className="flex items-center gap-2 mx-1 px-4 py-2.5 bg-emerald-800 text-white text-sm font-semibold rounded-xl hover:bg-emerald-900 transition-colors">
              <Phone size={14} /> Contact Us
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
