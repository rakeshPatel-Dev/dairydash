import { Outlet } from 'react-router-dom'
import { SaleFlowProvider } from '@/components/sale/SaleFlowContext'

/**
 * Shared shell for the multi-step sale flow (select → review → pay → done).
 * The provider keeps cart state alive while the customer moves between steps.
 */
export function SaleFlowLayout() {
  return (
    <SaleFlowProvider>
      <Outlet />
    </SaleFlowProvider>
  )
}
