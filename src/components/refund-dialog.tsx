'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2, Copy, Mail, DollarSign } from 'lucide-react'

interface Purchase {
  id: string
  merchant_name: string
  total_amount: number
  purchase_date: string
  return_deadline: string | null
  retailers?: {
    has_price_match: boolean
    price_match_days: number
  }
  price_tracking?: Array<{
    current_price: number
    price_drop_detected: boolean
    price_drop_amount: number
  }>
}

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: Purchase
}

export function RefundDialog({ open, onOpenChange, purchase }: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'price_drop' | 'return' | 'price_match'>('return')
  const [currentPrice, setCurrentPrice] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState<{
    subject: string
    body: string
    refund_amount: number
    refund_request_id: string
  } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [markingSent, setMarkingSent] = useState(false)
  const [success, setSuccess] = useState(false)

  // Check if price tracking exists for price_drop
  const hasPriceTracking = purchase.price_tracking && purchase.price_tracking.length > 0
  const trackedPrice = hasPriceTracking ? purchase.price_tracking?.[0]?.current_price : null

  // Check if retailer supports price matching
  const supportsPriceMatch = purchase.retailers?.has_price_match || false

  const handleGenerateEmail = async () => {
    setError('')

    // Validation
    if ((refundType === 'price_drop' || refundType === 'price_match') && !currentPrice) {
      setError('Please enter the current price')
      return
    }

    const currentPriceNum = parseFloat(currentPrice)
    if ((refundType === 'price_drop' || refundType === 'price_match') && isNaN(currentPriceNum)) {
      setError('Please enter a valid price')
      return
    }

    if (currentPriceNum >= purchase.total_amount) {
      setError('Current price must be lower than the original price')
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/refund/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: purchase.id,
          refund_type: refundType,
          current_price: currentPriceNum || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedEmail({
          subject: data.generated_email.subject,
          body: data.generated_email.body,
          refund_amount: data.refund_amount,
          refund_request_id: data.refund_request.id,
        })
      } else {
        setError(data.error || 'Failed to generate refund email')
      }
    } catch (err) {
      console.error('Failed to generate email:', err)
      setError('Failed to generate refund email. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyEmail = () => {
    if (!generatedEmail) return

    const emailText = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`
    navigator.clipboard.writeText(emailText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkAsSent = async () => {
    if (!generatedEmail) return

    setMarkingSent(true)
    setError('')

    try {
      const response = await fetch('/api/refund/generate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_request_id: generatedEmail.refund_request_id,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          window.location.reload()
        }, 1500)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to mark as sent')
      }
    } catch (err) {
      console.error('Failed to mark as sent:', err)
      setError('Failed to mark email as sent')
    } finally {
      setMarkingSent(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setRefundType('return')
      setCurrentPrice('')
      setGeneratedEmail(null)
      setError('')
      setCopied(false)
      setSuccess(false)
    }, 300)
  }

  const refundAmount =
    refundType === 'return'
      ? purchase.total_amount
      : purchase.total_amount - parseFloat(currentPrice || '0')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#37322F] font-sans">Request Refund</DialogTitle>
          <DialogDescription className="text-[#605A57] font-sans">
            Generate a professional email to request a refund or price adjustment
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-[#16A34A] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#37322F] mb-2 font-sans">
              Marked as sent!
            </h3>
            <p className="text-[#605A57] font-sans">
              Your refund request has been recorded.
            </p>
          </div>
        ) : generatedEmail ? (
          // Show generated email
          <div className="space-y-4">
            <div className="bg-[rgba(55,50,47,0.05)] p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#37322F] font-sans">
                  Refund Amount:
                </span>
                <span className="text-lg font-bold text-[#16A34A] font-sans">
                  ${generatedEmail.refund_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#37322F] font-sans">Subject:</Label>
              <Input
                value={generatedEmail.subject}
                readOnly
                className="border-[#E0DEDB] bg-white font-sans"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#37322F] font-sans">Email Body:</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyEmail}
                  className="border-[#E0DEDB] text-[#605A57] hover:bg-[rgba(55,50,47,0.05)] font-sans"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? 'Copied!' : 'Copy All'}
                </Button>
              </div>
              <Textarea
                value={generatedEmail.body}
                readOnly
                rows={12}
                className="border-[#E0DEDB] bg-white font-sans"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-[#B44D12] bg-[#FEF3F2] border border-[#FECDCA] rounded-lg font-sans">
                {error}
              </div>
            )}

            <div className="bg-[#2563EB]/10 border border-[#2563EB]/20 p-4 rounded-lg">
              <p className="text-sm text-[#2563EB] font-sans">
                <span className="font-semibold">💡 Next Steps:</span>
                <br />
                1. Copy the email above
                <br />
                2. Send it to {purchase.merchant_name} customer service
                <br />
                3. Mark it as sent below to track your request
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={markingSent}
                className="border-[#E0DEDB] text-[#605A57] hover:bg-[rgba(55,50,47,0.05)] font-sans"
              >
                Close
              </Button>
              <Button
                onClick={handleMarkAsSent}
                disabled={markingSent}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-sans"
              >
                {markingSent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Show refund type selection
          <div className="space-y-4">
            {/* Purchase Info */}
            <div className="bg-[rgba(55,50,47,0.05)] p-4 rounded-lg">
              <p className="text-sm text-[#605A57] font-sans">
                <span className="font-semibold text-[#37322F]">{purchase.merchant_name}</span>
              </p>
              <p className="text-sm text-[#605A57] mt-1 font-sans">
                Purchase amount: <span className="font-semibold">${purchase.total_amount.toFixed(2)}</span>
              </p>
              <p className="text-sm text-[#605A57] font-sans">
                Purchase date: {new Date(purchase.purchase_date).toLocaleDateString()}
              </p>
            </div>

            {/* Refund Type Selection */}
            <div className="space-y-3">
              <Label className="text-[#37322F] font-sans">Select refund type:</Label>

              {/* Return */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  refundType === 'return'
                    ? 'border-[#37322F] bg-[rgba(55,50,47,0.05)]'
                    : 'border-[#E0DEDB] hover:border-[#37322F]/30'
                }`}
                onClick={() => setRefundType('return')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-[#37322F] font-sans">Full Return</p>
                    <p className="text-sm text-[#605A57] mt-1 font-sans">
                      Return the entire purchase for a full refund
                    </p>
                  </div>
                  <DollarSign className="w-5 h-5 text-[#16A34A]" />
                </div>
              </div>

              {/* Price Drop */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  refundType === 'price_drop'
                    ? 'border-[#37322F] bg-[rgba(55,50,47,0.05)]'
                    : 'border-[#E0DEDB] hover:border-[#37322F]/30'
                }`}
                onClick={() => setRefundType('price_drop')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-[#37322F] font-sans">Price Drop Adjustment</p>
                    <p className="text-sm text-[#605A57] mt-1 font-sans">
                      Request a refund for the difference due to a price decrease
                    </p>
                    {hasPriceTracking && trackedPrice && (
                      <p className="text-sm text-[#2563EB] font-semibold mt-2 font-sans">
                        💰 Current tracked price: ${trackedPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <DollarSign className="w-5 h-5 text-[#2563EB]" />
                </div>
              </div>

              {/* Price Match */}
              <div
                className={`border-2 rounded-lg p-4 transition-colors ${
                  supportsPriceMatch
                    ? refundType === 'price_match'
                      ? 'border-[#37322F] bg-[rgba(55,50,47,0.05)] cursor-pointer'
                      : 'border-[#E0DEDB] hover:border-[#37322F]/30 cursor-pointer'
                    : 'border-[#E0DEDB] opacity-50 cursor-not-allowed'
                }`}
                onClick={() => supportsPriceMatch && setRefundType('price_match')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-[#37322F] font-sans">Price Match</p>
                    <p className="text-sm text-[#605A57] mt-1 font-sans">
                      Request price matching if found cheaper elsewhere
                    </p>
                    {!supportsPriceMatch && (
                      <p className="text-sm text-[#B44D12] mt-2 font-sans">
                        This retailer doesn't offer price matching
                      </p>
                    )}
                  </div>
                  <DollarSign className="w-5 h-5 text-[#EA580C]" />
                </div>
              </div>
            </div>

            {/* Current Price Input for price_drop and price_match */}
            {(refundType === 'price_drop' || refundType === 'price_match') && (
              <div className="space-y-2">
                <Label htmlFor="current-price" className="text-[#37322F] font-sans">
                  Current/Competitor Price:
                </Label>
                <Input
                  id="current-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="border-[#E0DEDB] focus:border-[#37322F] focus:ring-[#37322F] font-sans"
                />
                {currentPrice && !isNaN(parseFloat(currentPrice)) && parseFloat(currentPrice) < purchase.total_amount && (
                  <p className="text-sm text-[#16A34A] font-sans">
                    Potential refund: ${refundAmount.toFixed(2)}
                  </p>
                )}
                {hasPriceTracking && trackedPrice && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPrice(trackedPrice.toString())}
                    className="text-[#2563EB] font-sans"
                  >
                    Use tracked price (${trackedPrice.toFixed(2)})
                  </Button>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-[#B44D12] bg-[#FEF3F2] border border-[#FECDCA] rounded-lg font-sans">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={generating}
                className="border-[#E0DEDB] text-[#605A57] hover:bg-[rgba(55,50,47,0.05)] font-sans"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateEmail}
                disabled={generating}
                className="bg-[#37322F] hover:bg-[#2A2520] text-white font-sans"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Email'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
