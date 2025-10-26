'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'
import { TrackPriceDialog } from '@/components/track-price-dialog'

interface Purchase {
  id: string
  merchant_name: string
  total_amount: number
  purchase_date: string
  return_deadline: string | null
  items: any[]
  price_tracking?: Array<{
    price_drop_detected: boolean
    price_drop_amount: number
  }>
}

interface PurchasesListProps {
  purchases: Purchase[]
}

export function PurchasesList({ purchases }: PurchasesListProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleTrackPrice = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setDialogOpen(true)
  }

  const getFirstItemName = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return null
    return items[0]?.name || null
  }

  const hasTracking = (purchase: Purchase) => {
    return purchase.price_tracking && purchase.price_tracking.length > 0
  }

  return (
    <>
      <div className="space-y-4">
        {purchases.map((purchase) => {
          const deadline = purchase.return_deadline ? new Date(purchase.return_deadline) : null
          const daysUntil = deadline
            ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null

          return (
            <div
              key={purchase.id}
              className="flex items-center justify-between p-4 border border-[#E0DEDB] rounded-lg hover:bg-[rgba(55,50,47,0.02)] transition-colors gap-4"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-[#37322F] font-sans">
                      {purchase.merchant_name}
                    </h3>
                    <p className="text-sm text-[#605A57] font-sans">
                      ${purchase.total_amount.toFixed(2)} •{' '}
                      {new Date(purchase.purchase_date).toLocaleDateString()}
                    </p>
                    {purchase.items && Array.isArray(purchase.items) && (
                      <p className="text-sm text-[#605A57] mt-1 font-sans">
                        {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {purchase.price_tracking?.[0]?.price_drop_detected && (
                      <p className="text-sm text-[#2563EB] font-semibold mt-1 font-sans">
                        💰 Price dropped $
                        {purchase.price_tracking[0].price_drop_amount?.toFixed(2)}!
                      </p>
                    )}
                  </div>

                  {!hasTracking(purchase) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTrackPrice(purchase)}
                      className="border-[#37322F] text-[#37322F] hover:bg-[#37322F] hover:text-white font-sans flex-shrink-0"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Track Price
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                {daysUntil !== null && (
                  <>
                    <p
                      className={`font-semibold font-sans ${
                        daysUntil < 7
                          ? 'text-[#EA580C]'
                          : daysUntil < 0
                          ? 'text-[#B44D12]'
                          : 'text-[#16A34A]'
                      }`}
                    >
                      {daysUntil < 0 ? 'Expired' : `${daysUntil} days left`}
                    </p>
                    <p className="text-sm text-[#605A57] font-sans">
                      Return by {deadline?.toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedPurchase && (
        <TrackPriceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          purchaseId={selectedPurchase.id}
          merchantName={selectedPurchase.merchant_name}
          productName={getFirstItemName(selectedPurchase.items) || undefined}
          totalAmount={selectedPurchase.total_amount}
        />
      )}
    </>
  )
}
