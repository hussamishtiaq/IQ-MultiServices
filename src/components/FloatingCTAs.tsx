import { Phone as PhoneIcon } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa6'
import { safeContactHref } from '@/lib/safe-url'
import type { Contact } from '@/types'

/**
 * Sticky bottom-right floating WhatsApp + Call buttons on mobile/tablet.
 * Picks the first WhatsApp and first phone contact entry.
 */
export default function FloatingCTAs({ contacts }: { contacts: Contact[] }) {
  const whatsapp = contacts.find(c => c.platform.toLowerCase() === 'whatsapp')
  const phone    = contacts.find(c => c.platform.toLowerCase() === 'phone')

  if (!whatsapp && !phone) return null

  const wa  = whatsapp ? safeContactHref(whatsapp.platform, whatsapp.value) : null
  const tel = phone    ? safeContactHref(phone.platform,    phone.value)    : null

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3 lg:hidden">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <FaWhatsapp size={26} />
        </a>
      )}
      {tel && (
        <a
          href={tel}
          aria-label="Call us"
          className="w-14 h-14 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <PhoneIcon size={22} />
        </a>
      )}
    </div>
  )
}
