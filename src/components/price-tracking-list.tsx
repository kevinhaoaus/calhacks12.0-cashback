'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ExternalLink, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface PriceTracking {
  id: string
  product_name: string
  product_url: string
  original_price: number
  current_price: number
  lowest_price: number
  last_checked: string
  tracking_active: boolean
  purchases: {
    merchant_name: string
  }
}

export function PriceTrackingList() {
  const [tracking, setTracking] = useState<PriceTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTracking()
  }, [])

  const fetchTracking = async () => {
    try {
      const response = await fetch('/api/track-price')
      const data = await response.json()
      setTracking(data.tracking || [])
    } catch (error) {
      console.error('Failed to fetch price tracking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)

    // Optimistic update
    setTracking(prev => prev.filter(t => t.id !== id))

    try {
      const response = await fetch(`/api/track-price?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert on error
        await fetchTracking()
        alert('Failed to remove tracking')
      }
    } catch (error) {
      console.error('Failed to remove tracking:', error)
      // Revert on error
      await fetchTracking()
      alert('Failed to remove tracking')
    } finally {
      setRemovingId(null)
    }
  }

  const calculatePriceChange = (original: number, current: number) => {
    const change = ((current - original) / original) * 100
    return change
  }

  const getPriceChangeIcon = (change: number) => {
    if (change < -1) return <TrendingDown className="w-4 h-4 text-[#16A34A]" />
    if (change > 1) return <TrendingUp className="w-4 h-4 text-[#EA580C]" />
    return <Minus className="w-4 h-4 text-[#605A57]" />
  }

  const truncateUrl = (url: string, maxLength = 40) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37322F]"></div>
      </div>
    )
  }

  if (tracking.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#605A57] font-sans mb-2">No products are currently being tracked</p>
        <p className="text-sm text-[#605A57]/60 font-sans">
          Price tracking will be added automatically when available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tracking.map((item) => {
        const priceChange = calculatePriceChange(item.original_price, item.current_price)
        const priceDiff = item.current_price - item.original_price

        return (
          <div
            key={item.id}
            className="border border-[#E0DEDB] rounded-lg p-4 hover:bg-[rgba(55,50,47,0.02)] transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Product Name */}
                <h3 className="font-semibold text-[#37322F] font-sans mb-1">
                  {item.product_name}
                </h3>

                {/* Product URL */}
                <a
                  href={item.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 mb-3 font-sans"
                >
                  <span className="truncate">{truncateUrl(item.product_url)}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>

                {/* Price Information Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[#605A57]/60 text-xs font-sans mb-1">Original Price</p>
                    <p className="font-semibold text-[#37322F] font-sans">
                      ${item.original_price.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#605A57]/60 text-xs font-sans mb-1">Current Price</p>
                    <p className="font-semibold text-[#37322F] font-sans">
                      ${item.current_price.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#605A57]/60 text-xs font-sans mb-1">Lowest Price</p>
                    <p className="font-semibold text-[#16A34A] font-sans">
                      ${item.lowest_price.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#605A57]/60 text-xs font-sans mb-1">Price Change</p>
                    <div className="flex items-center gap-1">
                      {getPriceChangeIcon(priceChange)}
                      <span
                        className={`font-semibold font-sans ${
                          priceChange < -1
                            ? 'text-[#16A34A]'
                            : priceChange > 1
                            ? 'text-[#EA580C]'
                            : 'text-[#605A57]'
                        }`}
                      >
                        {priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Checked */}
                <p className="text-xs text-[#605A57]/60 mt-3 font-sans">
                  Last checked: {new Date(item.last_checked).toLocaleString()}
                </p>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(item.id)}
                disabled={removingId === item.id}
                className="flex-shrink-0 text-[#B44D12] hover:text-[#EA580C] hover:bg-[#FEF3F2] font-sans"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
