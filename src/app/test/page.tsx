'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/file-upload'
import Link from 'next/link'

const SAMPLE_RECEIPTS = {
  target: `TARGET STORE #1234
123 Main St, San Francisco, CA

Date: 01/15/2025
Time: 2:34 PM

ITEMS:
Sony WH-1000XM5 Headphones    $399.99
USB-C Cable                    $19.99
Screen Protector              $24.99

SUBTOTAL:                     $444.97
TAX (8.5%):                    $37.82
TOTAL:                        $482.79

Payment: VISA ****1234
Thank you for shopping at Target!`,

  walmart: `Walmart Supercenter
456 Oak Ave, Los Angeles, CA
Store #5678

01/20/2025  3:15 PM

Items Purchased:
1. Nike Air Max 270          $129.99
2. Gym Water Bottle           $15.99
3. Protein Powder 2lb         $34.99

Subtotal:                    $180.97
Tax:                          $15.38
TOTAL:                       $196.35

Card ending in 5678
Ref: WM20250120031545`,

  amazon: `Amazon.com Order Confirmation
Order #: 123-4567890-1234567
Order Date: January 10, 2025

Items Ordered:
- Logitech MX Master 3 Mouse
  Qty: 1
  Price: $99.99

- USB Hub 7-Port
  Qty: 1
  Price: $29.99

Order Subtotal:              $129.98
Estimated Tax:                $11.05
Order Total:                 $141.03

Delivery: Jan 12, 2025
Payment: Visa ending in 9012`,
}

export default function TestPage() {
  const [activeTab, setActiveTab] = useState<'text' | 'photo'>('text')
  const [receiptText, setReceiptText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const loadSample = (sample: keyof typeof SAMPLE_RECEIPTS) => {
    setReceiptText(SAMPLE_RECEIPTS[sample])
    setResult(null)
    setError('')
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process receipt')
      }

      setResult(data)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload-receipt', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process receipt')
      }

      setResult(data)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F3] py-12 px-4 font-sans">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard">
            <h1 className="text-3xl font-serif font-normal text-[#37322F] cursor-pointer hover:opacity-80 transition-opacity">
              FairVal
            </h1>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans">
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div>
          <h2 className="text-3xl font-serif font-normal text-[#37322F] mb-2">Submit Your Receipt</h2>
          <p className="text-[#605A57] text-lg font-sans">
            Upload a photo, paste text, or use our sample receipts
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-[rgba(55,50,47,0.12)]">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors font-sans ${
              activeTab === 'text'
                ? 'border-[#37322F] text-[#37322F]'
                : 'border-transparent text-[#605A57] hover:text-[#37322F]'
            }`}
          >
            📝 Paste Text
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors font-sans ${
              activeTab === 'photo'
                ? 'border-[#37322F] text-[#37322F]'
                : 'border-transparent text-[#605A57] hover:text-[#37322F]'
            }`}
          >
            📸 Upload Photo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">
                {activeTab === 'text' ? 'Receipt Text' : 'Upload Receipt Photo'}
              </CardTitle>
              <CardDescription className="text-[#605A57] font-sans">
                {activeTab === 'text'
                  ? 'Paste receipt text or load a sample'
                  : 'Take a photo or upload an image of your receipt'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTab === 'text' ? (
                <form onSubmit={handleTextSubmit} className="space-y-4">
                <div>
                  <Label className="text-[#37322F] font-sans font-medium">Sample Receipts</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample('target')}
                      className="border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans"
                    >
                      Target
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample('walmart')}
                      className="border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans"
                    >
                      Walmart
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample('amazon')}
                      className="border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans"
                    >
                      Amazon
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="receipt" className="text-[#37322F] font-sans font-medium">Receipt Text</Label>
                  <textarea
                    id="receipt"
                    className="w-full h-64 p-3 border border-[#E0DEDB] rounded-lg font-mono text-sm mt-2 focus:border-[#37322F] focus:ring-1 focus:ring-[#37322F] outline-none transition-colors"
                    value={receiptText}
                    onChange={(e) => setReceiptText(e.target.value)}
                    placeholder="Paste receipt text here..."
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-[#FEF3F2] text-[#B44D12] border border-[#FECDCA] rounded-lg text-sm font-sans">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#37322F] hover:bg-[#2A2520] text-white font-medium rounded-full shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset] font-sans"
                  disabled={loading}
                >
                  {loading ? 'Processing with Claude AI...' : 'Process Receipt'}
                </Button>
              </form>
              ) : (
                <form onSubmit={handleFileSubmit} className="space-y-4">
                  <FileUpload
                    onFileSelect={setSelectedFile}
                    accept="image/*"
                    label="Upload Receipt Image"
                    allowCamera={true}
                  />

                  {error && (
                    <div className="p-3 bg-[#FEF3F2] text-[#B44D12] border border-[#FECDCA] rounded-lg text-sm font-sans">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#37322F] hover:bg-[#2A2520] text-white font-medium rounded-full shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset] font-sans"
                    disabled={loading || !selectedFile}
                  >
                    {loading ? 'Processing with Claude Vision...' : 'Process Receipt Photo'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Extraction Results</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">
                Claude AI analysis of the receipt
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mx-auto mb-4" />
                  <p className="text-[#605A57] font-sans">Analyzing receipt with Claude...</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg">
                    <p className="text-[#15803D] font-semibold font-sans">✓ Receipt processed successfully!</p>
                    <p className="text-sm text-[#16A34A] mt-1 font-sans">
                      Redirecting to dashboard...
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-[#605A57] font-sans">Merchant</Label>
                      <p className="font-semibold text-[#37322F] font-sans">{result.receiptData.merchant}</p>
                    </div>

                    <div>
                      <Label className="text-[#605A57] font-sans">Date</Label>
                      <p className="font-semibold text-[#37322F] font-sans">{result.receiptData.date}</p>
                    </div>

                    <div>
                      <Label className="text-[#605A57] font-sans">Total</Label>
                      <p className="font-semibold text-lg text-[#37322F] font-sans">
                        ${result.receiptData.total.toFixed(2)} {result.receiptData.currency}
                      </p>
                    </div>

                    <div>
                      <Label className="text-[#605A57] font-sans">Items ({result.receiptData.items.length})</Label>
                      <ul className="mt-2 space-y-1">
                        {result.receiptData.items.map((item: any, i: number) => (
                          <li key={i} className="text-sm flex justify-between text-[#37322F] font-sans">
                            <span>{item.name} x{item.quantity}</span>
                            <span className="font-semibold">${item.price.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <Label className="text-[#605A57] font-sans">Confidence</Label>
                      <div className="mt-2">
                        <div className="h-2 bg-[rgba(55,50,47,0.1)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#37322F]"
                            style={{ width: `${result.receiptData.confidence * 100}%` }}
                          />
                        </div>
                        <p className="text-sm text-[#605A57] mt-1 font-sans">
                          {(result.receiptData.confidence * 100).toFixed(0)}% confident
                        </p>
                      </div>
                    </div>

                    {result.analysis && (
                      <div className="pt-4 border-t border-[#E0DEDB]">
                        <Label className="text-[#605A57] font-sans">Return Analysis</Label>
                        <p className="text-sm mt-2 font-sans">
                          <span className={result.analysis.is_returnable ? 'text-[#16A34A]' : 'text-[#B44D12]'}>
                            {result.analysis.is_returnable ? '✓ Returnable' : '✗ Not returnable'}
                          </span>
                          {result.analysis.days_remaining > 0 && (
                            <span className="text-[#605A57]">
                              {' '}• {result.analysis.days_remaining} days remaining
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!loading && !result && (
                <div className="text-center py-12 text-[#605A57]">
                  <p className="font-sans">Results will appear here after processing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
