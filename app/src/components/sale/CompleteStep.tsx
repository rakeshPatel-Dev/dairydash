import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHead } from '@/components/PageHead'
import { Notice } from '@/components/Notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ReceiptSheet, useReceiptData } from '@/components/Receipt'
import { useSaleFlow } from '@/components/sale/SaleFlowContext'
import { SaleSteps } from '@/components/sale/SaleSteps'

const AUTO_RETURN_SECONDS = 8

export function CompleteStep() {
  const navigate = useNavigate()
  const { completedSaleId, setCompletedSaleId } = useSaleFlow()

  useEffect(() => {
    if (!completedSaleId) navigate('/sale', { replace: true })
  }, [completedSaleId, navigate])

  if (!completedSaleId) return null

  return <SaleCompleted saleId={completedSaleId} onCleared={() => setCompletedSaleId(null)} />
}

function SaleCompleted({ saleId, onCleared }: { saleId: string; onCleared: () => void }) {
  const [seconds, setSeconds] = useState(AUTO_RETURN_SECONDS)
  const [autoReturn, setAutoReturn] = useState(true)
  const navigate = useNavigate()
  const data = useReceiptData(saleId)

  useEffect(() => {
    if (!autoReturn) return
    if (seconds <= 0) {
      startNext()
      return
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReturn, seconds])

  function startNext() {
    onCleared()
    navigate('/sale', { replace: true })
  }

  return (
    <>
      <PageHead
        eyebrow="Point of sale"
        title="Sale saved"
        description="The invoice is recorded. Print it or move straight to the next customer."
      />
      <SaleSteps current={3} />

      <div className="mx-auto max-w-[560px]">
        {data.error && <Notice tone="error">{data.error}</Notice>}

        <div className="mb-5 flex items-center justify-center gap-2.5 text-[0.95rem] font-semibold text-primary-strong">
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-[1.1rem]">✓</span>
          Invoice recorded{data.sale ? ` — #${data.sale.invoice_no}` : ''} ·{' '}
          <Badge variant="default">saved to database</Badge>
        </div>

        <Card className="print-area bg-surface p-3 max-sm:p-2">
          <ReceiptSheet data={data} />
        </Card>

        <div className="mt-4 grid gap-2.5">
          <Button block className="h-[50px] text-[1rem]" onClick={() => window.print()} disabled={!data.sale}>
            🖨 Print / Save PDF
          </Button>
          <Button block variant="outline" className="h-[46px]" onClick={startNext}>
            Start next sale{autoReturn ? ` (${seconds}s)` : ''}
          </Button>
        </div>

        <div className="mt-2.5 pb-60 text-center text-[0.8rem] text-ink-3">
          {autoReturn ? (
            <>
              Returning to product selection in {seconds}s ·{' '}
              <button
                type="button"
                className="cursor-pointer font-semibold underline underline-offset-2 hover:text-foreground"
                onClick={() => setAutoReturn(false)}
              >
                stay on this receipt
              </button>
            </>
          ) : (
            <button
              type="button"
              className="cursor-pointer font-semibold underline underline-offset-2 hover:text-foreground"
              onClick={() => setAutoReturn(true)}
            >
              resume auto-return
            </button>
          )}
        </div>
      </div>
    </>
  )
}
