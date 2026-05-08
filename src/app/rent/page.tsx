import { redirect } from 'next/navigation'
export const metadata = { title: 'Properties for Rent' }
export default function RentPage() {
  redirect('/properties?listing=rent')
}
