import type { Service } from '@/types'

export default function ServiceCard({ service: s }: { service: Service }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
      {/* Icon */}
      {
        s.icon&&(
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:bg-emerald-100 transition-colors duration-200 flex-shrink-0">
        {s.icon || '⚡'}
      </div>
        )
      }

      <h3 className="font-bold text-slate-900 text-lg mb-2 leading-snug">{s.title}</h3>

      {s.description && (
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{s.description}</p>
      )}
    </div>
  )
}
