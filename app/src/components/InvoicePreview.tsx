import { formatRupees } from '../lib/money'

interface InvoicePreviewProps {
  businessName?: string
  contact?: string
  footer?: string
}

const SAMPLE_LINES = [
  { title: ' Milk', pack: '1 L pouch', qty: '2 L', rate: 130, total: 260 },
  { title: 'Ghee', pack: '1 kg tin', qty: '1 pc', rate: 1450, total: 1450 },
  { title: 'Dahi', pack: '500 g pot', qty: '5 pc', rate: 95, total: 475 },
]

/** Live, screen-only miniature of the printed A4 receipt (sample data). */
export function InvoicePreview({ businessName = '', contact = '', footer = '' }: InvoicePreviewProps) {
  const total = SAMPLE_LINES.reduce((sum, line) => sum + line.total, 0)

  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[14px] border border-line bg-white p-4 text-[0.72rem] leading-[1.45] shadow-xs">
      <div className="text-center text-[0.95rem] leading-tight font-extrabold tracking-[-0.02em]">
        {businessName.trim() || 'Dairydash'}
      </div>
      {contact.trim() && <div className="mt-1 text-center text-ink-3">{contact.trim()}</div>}
      <div className="mt-1 text-center text-ink-3">Invoice #1042 · Fri, 23 Oct 03:20 PM</div>
      <div className="text-center text-ink-3">Retail · Walk-in</div>

      <table className="mt-2.5 w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-[#e6ece7] px-1 pb-1 text-left text-[0.58rem] font-bold tracking-[0.08em] text-ink-3 uppercase">
              Item
            </th>
            <th className="border-b border-[#e6ece7] px-1 pb-1 text-right text-[0.58rem] font-bold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase">
              Qty
            </th>
            <th className="border-b border-[#e6ece7] px-1 pb-1 text-right text-[0.58rem] font-bold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase">
              Rate
            </th>
            <th className="border-b border-[#e6ece7] px-1 pb-1 text-right text-[0.58rem] font-bold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_LINES.map((line) => (
            <tr key={line.title}>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1">
                {line.title} <span className="text-ink-3">· {line.pack}</span>
              </td>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1 text-right whitespace-nowrap">
                {line.qty}
              </td>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1 text-right whitespace-nowrap">
                {formatRupees(line.rate)}
              </td>
              <td className="border-b border-dashed border-[#eef2ee] px-1 py-1 text-right whitespace-nowrap">
                {formatRupees(line.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className="flex justify-between border-t border-[#333] pt-1 pb-1 text-[0.78rem] font-extrabold">
          <span>Total</span>
          <span>{formatRupees(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cash</span>
          <span>{formatRupees(1400)}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance due</span>
          <span>{formatRupees(total - 1400)}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span>Partially paid</span>
        </div>
      </div>

      <div className="mt-2.5 border-t border-dashed border-[#eef2ee] pt-2 text-center whitespace-pre-line text-ink-3">
        {footer.trim() || 'Thank you!'}
      </div>
    </div>
  )
}
