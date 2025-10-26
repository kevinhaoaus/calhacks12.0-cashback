'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TrendingUp, X, DollarSign } from 'lucide-react'
import { TrackPriceDialog } from '@/components/track-price-dialog'
import { RefundDialog } from '@/components/refund-dialog'

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
    current_price: number
  }>
  retailers?: {
    has_price_match: boolean
    price_match_days: number
  }
}

interface PurchasesListProps {
  purchases: Purchase[]
}

export function PurchasesList({ purchases: initialPurchases }: PurchasesListProps) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [selectedRefundPurchase, setSelectedRefundPurchase] = useState<Purchase | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sync local state with prop updates
  useEffect(() => {
    setPurchases(initialPurchases)
  }, [initialPurchases])

  const handleTrackPrice = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setDialogOpen(true)
  }

  const handleRequestRefund = (purchase: Purchase) => {
    setSelectedRefundPurchase(purchase)
    setRefundDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase? This will also remove any price tracking for this item.')) {
      return
    }

    setDeletingId(id)

    // Optimistic update
    setPurchases(prev => prev.filter(p => p.id !== id))

    try {
      const response = await fetch(`/api/purchases?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert on error
        setPurchases(initialPurchases)
        alert('Failed to delete purchase')
      }
    } catch (error) {
      console.error('Failed to delete purchase:', error)
      // Revert on error
      setPurchases(initialPurchases)
      alert('Failed to delete purchase')
    } finally {
      setDeletingId(null)
    }
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
                      {new Date(purchase.purchase_date).toLocaleDateString('en-US')}
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

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestRefund(purchase)}
                      className="border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white font-sans"
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Request Refund
                    </Button>
                    {!hasTracking(purchase) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTrackPrice(purchase)}
                        className="border-[#37322F] text-[#37322F] hover:bg-[#37322F] hover:text-white font-sans"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Track Price
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(purchase.id)}
                      disabled={deletingId === purchase.id}
                      className="text-[#B44D12] hover:text-[#EA580C] hover:bg-[#FEF3F2]"
                      title="Delete purchase"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
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
                      Return by {deadline?.toLocaleDateString('en-US')}
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

      {selectedRefundPurchase && (
        <RefundDialog
          open={refundDialogOpen}
          onOpenChange={setRefundDialogOpen}
          purchase={selectedRefundPurchase}
        />
      )}
    </>
  )
}
