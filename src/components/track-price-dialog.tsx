'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'

interface ProductSuggestion {
  url: string
  title: string
  confidence: string
  source: string
}

interface TrackPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseId: string
  merchantName: string
  productName?: string
  totalAmount: number
}

export function TrackPriceDialog({
  open,
  onOpenChange,
  purchaseId,
  merchantName,
  productName,
  totalAmount,
}: TrackPriceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [selectedUrl, setSelectedUrl] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Auto-fetch suggestions when dialog opens
  useEffect(() => {
    if (open && suggestions.length === 0 && !loading) {
      fetchSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fetchSuggestions = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/suggest-product-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName || merchantName,
          merchantName,
          purchaseId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuggestions(data.suggestions || [])
        if (data.suggestions?.length > 0) {
          setSelectedUrl(data.suggestions[0].url)
        }
      } else {
        setError(data.error || 'Failed to fetch suggestions')
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
      setError('Failed to fetch product URL suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTracking = async () => {
    const urlToTrack = showCustomInput ? customUrl : selectedUrl

    if (!urlToTrack) {
      setError('Please select or enter a product URL')
      return
    }

    setTracking(true)
    setError('')

    try {
      const response = await fetch('/api/track-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: purchaseId,
          product_url: urlToTrack,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          // Refresh the page to show updated tracking
          window.location.reload()
        }, 1500)
      } else {
        setError(data.error || 'Failed to start price tracking')
      }
    } catch (err) {
      console.error('Failed to start tracking:', err)
      setError('Failed to start price tracking')
    } finally {
      setTracking(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setSuggestions([])
      setSelectedUrl('')
      setCustomUrl('')
      setShowCustomInput(false)
      setSuccess(false)
      setError('')
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#37322F] font-sans">Track Price</DialogTitle>
          <DialogDescription className="text-[#605A57] font-sans">
            Monitor this product for price drops and get notified when you can get a refund
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-[#16A34A] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#37322F] mb-2 font-sans">
              Price tracking started!
            </h3>
            <p className="text-[#605A57] font-sans">
              We'll check the price daily and notify you of any drops.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Purchase Info */}
              <div className="bg-[rgba(55,50,47,0.05)] p-4 rounded-lg">
                <p className="text-sm text-[#605A57] font-sans">
                  <span className="font-semibold text-[#37322F]">{merchantName}</span>
                  {productName && ` • ${productName}`}
                </p>
                <p className="text-sm text-[#605A57] mt-1 font-sans">
                  Purchase amount: <span className="font-semibold">${totalAmount.toFixed(2)}</span>
                </p>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#37322F]" />
                  <span className="ml-3 text-[#605A57] font-sans">Finding product URLs...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-3 text-sm text-[#B44D12] bg-[#FEF3F2] border border-[#FECDCA] rounded-lg font-sans">
                  {error}
                </div>
              )}

              {/* Suggestions */}
              {!loading && suggestions.length > 0 && !showCustomInput && (
                <div className="space-y-3">
                  <Label className="text-[#37322F] font-sans">Select product page:</Label>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedUrl === suggestion.url
                          ? 'border-[#37322F] bg-[rgba(55,50,47,0.05)]'
                          : 'border-[#E0DEDB] hover:border-[#37322F]/30'
                      }`}
                      onClick={() => setSelectedUrl(suggestion.url)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#37322F] text-sm font-sans mb-1">
                            {suggestion.title}
                          </p>
                          <a
                            href={suggestion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-sans"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">{suggestion.url}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`text-xs px-2 py-1 rounded font-sans ${
                              suggestion.confidence === 'high'
                                ? 'bg-[#16A34A]/10 text-[#16A34A]'
                                : suggestion.confidence === 'medium'
                                ? 'bg-[#2563EB]/10 text-[#2563EB]'
                                : 'bg-[#605A57]/10 text-[#605A57]'
                            }`}
                          >
                            {suggestion.confidence}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full border-[#E0DEDB] text-[#605A57] hover:bg-[rgba(55,50,47,0.05)] font-sans"
                  >
                    Or enter URL manually
                  </Button>
                </div>
              )}

              {/* Custom URL Input */}
              {(showCustomInput || (!loading && suggestions.length === 0)) && (
                <div className="space-y-2">
                  <Label htmlFor="custom-url" className="text-[#37322F] font-sans">
                    Product page URL:
                  </Label>
                  <Input
                    id="custom-url"
                    type="url"
                    placeholder="https://www.amazon.com/product/..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="border-[#E0DEDB] focus:border-[#37322F] focus:ring-[#37322F] font-sans"
                  />
                  <p className="text-xs text-[#605A57] font-sans">
                    Supported: Amazon, Walmart, Target, Best Buy, Home Depot, eBay
                  </p>
                  {suggestions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCustomInput(false)
                        setCustomUrl('')
                      }}
                      className="text-[#605A57] font-sans"
                    >
                      ← Back to suggestions
                    </Button>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={tracking}
                className="border-[#E0DEDB] text-[#605A57] hover:bg-[rgba(55,50,47,0.05)] font-sans"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartTracking}
                disabled={tracking || (!selectedUrl && !customUrl)}
                className="bg-[#37322F] hover:bg-[#2A2520] text-white font-sans"
              >
                {tracking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Tracking'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
