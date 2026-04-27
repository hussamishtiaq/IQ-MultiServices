import type { Service } from '@/types'

export default function ServiceCard({ service: s }: { service: Service }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
      <h3 className="font-bold text-slate-900 text-lg mb-2 leading-snug">{s.title}</h3>

      {s.description && (
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{s.description}</p>
      )}
    </div>
  )
}
