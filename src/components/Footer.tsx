import Link from 'next/link'
import { Building2, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="container-main py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-slate-800">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 text-white font-bold text-lg mb-4">
              <div className="w-8 h-8 bg-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-white" />
              </div>
              IQ MultiServices
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your trusted partner in real estate listings and professional business services.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: '/properties', label: 'Browse Properties' },
                { href: '/services',   label: 'Our Services'      },
                { href: '/contact',    label: 'Contact Us'        },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">Contact</h3>
            <div className="space-y-2.5 text-sm">
              <Link href="/contact" className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                <Mail size={14} className="text-emerald-500 flex-shrink-0" />
                View all contact options
              </Link>
              <Link href="/contact" className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                <Phone size={14} className="text-emerald-500 flex-shrink-0" />
                Social media channels
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} IQ MultiServices. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
