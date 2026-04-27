import { Mail, Phone as PhoneIcon, Globe } from 'lucide-react'
import { FaWhatsapp, FaInstagram, FaFacebook, FaXTwitter, FaTelegram } from 'react-icons/fa6'
import type { ComponentType, SVGProps } from 'react'

export const PLATFORMS = [
  'email', 'whatsapp', 'instagram', 'facebook', 'twitter', 'telegram', 'phone', 'website',
] as const

export type Platform = typeof PLATFORMS[number]

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

const ICONS: Record<Platform, IconComp> = {
  email:     Mail,
  whatsapp:  FaWhatsapp,
  instagram: FaInstagram,
  facebook:  FaFacebook,
  twitter:   FaXTwitter,
  telegram:  FaTelegram,
  phone:     PhoneIcon,
  website:   Globe,
}

const LABELS: Record<Platform, string> = {
  email:     'Email',
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  facebook:  'Facebook',
  twitter:   'Twitter / X',
  telegram:  'Telegram',
  phone:     'Phone',
  website:   'Website',
}

export function platformLabel(platform: string): string {
  return LABELS[platform as Platform] ?? platform
}

export function PlatformIcon({
  platform,
  size = 18,
  className,
}: {
  platform: string
  size?: number
  className?: string
}) {
  const Icon = ICONS[platform as Platform] ?? PhoneIcon
  return <Icon size={size} className={className} />
}
