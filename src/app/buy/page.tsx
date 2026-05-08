import { redirect } from 'next/navigation'
export const metadata = { title: 'Properties for Sale' }
export default function BuyPage() {
  redirect('/properties?listing=sale')
}
