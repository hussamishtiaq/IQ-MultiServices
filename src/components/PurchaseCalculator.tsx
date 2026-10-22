'use client'

import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { monthlyPayment, purchaseCosts } from '@/lib/purchase-costs'

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`

export default function PurchaseCalculator({ priceAed, offPlan }: { priceAed: number; offPlan: boolean }) {
  const [financed, setFinanced] = useState(!offPlan)
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(4.5)
  const [years, setYears] = useState(25)

  const costs = useMemo(() => purchaseCosts({ priceAed, offPlan, financed, downPaymentPct: downPct }), [priceAed, offPlan, financed, downPct])
  const monthly = financed ? monthlyPayment(costs.loanAmount, rate, years) : 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
        <Calculator size={16} className="text-emerald-700" /> Cost of buying
      </h3>
      <p className="text-xs text-slate-500 mb-4">Estimated Dubai fees{offPlan ? ' for an off-plan purchase' : ''}. Final amounts depend on the bank and DLD.</p>

      {!offPlan && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[false, true].map(f => (
            <button key={String(f)} type="button" onClick={() => setFinanced(f)}
              className={`py-2 rounded-xl text-xs font-semibold border-2 ${financed === f ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}>
              {f ? 'With mortgage' : 'Cash'}
            </button>
          ))}
        </div>
      )}

      {financed && !offPlan && (
        <div className="space-y-3 mb-4">
          <label className="block text-xs text-slate-600">
            <span className="flex justify-between"><span>Down payment</span><b>{downPct}% · {aed(priceAed * downPct / 100)}</b></span>
            <input type="range" min={20} max={80} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} className="w-full accent-emerald-700" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-600">Interest rate %
              <input type="number" min={0} max={15} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value) || 0)} className="input-field py-1.5 text-sm mt-1" />
            </label>
            <label className="text-xs text-slate-600">Term (years)
              <input type="number" min={1} max={25} value={years} onChange={e => setYears(Math.min(25, Math.max(1, Number(e.target.value) || 1)))} className="input-field py-1.5 text-sm mt-1" />
            </label>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 flex justify-between items-baseline">
            <span className="text-xs text-emerald-800">Monthly payment</span>
            <span className="text-lg font-bold text-emerald-900">{aed(monthly)}</span>
          </div>
        </div>
      )}

      <dl className="space-y-1.5 text-xs">
        {costs.lines.map(l => (
          <div key={l.label} className="flex justify-between gap-3">
            <dt className="text-slate-500">{l.label}</dt>
            <dd className="text-slate-800 font-medium whitespace-nowrap">{aed(l.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 pt-2 mt-2 border-t border-slate-100 text-sm">
          <dt className="text-slate-700 font-semibold">Total fees</dt>
          <dd className="font-bold text-slate-900">{aed(costs.totalFees)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <dt className="text-slate-700 font-semibold">{financed ? 'Cash needed upfront' : 'Total cost'}</dt>
          <dd className="font-bold text-emerald-800">{aed(costs.cashNeeded)}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-slate-400 mt-3 leading-snug">
        Estimates only, not financial advice. UAE Central Bank rules cap loan-to-value by residency and property value. Your bank confirms the final terms.
      </p>
    </div>
  )
}
