'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/file-upload'

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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit Your Receipt</h1>
          <p className="text-gray-600">
            Upload a photo, paste text, or use our sample receipts
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Paste Text
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'photo'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📸 Upload Photo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'text' ? 'Receipt Text' : 'Upload Receipt Photo'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'text'
                  ? 'Paste receipt text or load a sample'
                  : 'Take a photo or upload an image of your receipt'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTab === 'text' ? (
                <form onSubmit={handleTextSubmit} className="space-y-4">
                <div>
                  <Label>Sample Receipts</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample('target')}
                    >
                      Target
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample('walmart')}
                    >
                      Walmart
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample('amazon')}
                    >
                      Amazon
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="receipt">Receipt Text</Label>
                  <textarea
                    id="receipt"
                    className="w-full h-64 p-3 border rounded-lg font-mono text-sm mt-2"
                    value={receiptText}
                    onChange={(e) => setReceiptText(e.target.value)}
                    placeholder="Paste receipt text here..."
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
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
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !selectedFile}
                  >
                    {loading ? 'Processing with Claude Vision...' : 'Process Receipt Photo'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Extraction Results</CardTitle>
              <CardDescription>
                Claude AI analysis of the receipt
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Analyzing receipt with Claude...</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-semibold">✓ Receipt processed successfully!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Redirecting to dashboard...
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-500">Merchant</Label>
                      <p className="font-semibold">{result.receiptData.merchant}</p>
                    </div>

                    <div>
                      <Label className="text-gray-500">Date</Label>
                      <p className="font-semibold">{result.receiptData.date}</p>
                    </div>

                    <div>
                      <Label className="text-gray-500">Total</Label>
                      <p className="font-semibold text-lg">
                        ${result.receiptData.total.toFixed(2)} {result.receiptData.currency}
                      </p>
                    </div>

                    <div>
                      <Label className="text-gray-500">Items ({result.receiptData.items.length})</Label>
                      <ul className="mt-2 space-y-1">
                        {result.receiptData.items.map((item: any, i: number) => (
                          <li key={i} className="text-sm flex justify-between">
                            <span>{item.name} x{item.quantity}</span>
                            <span className="font-semibold">${item.price.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <Label className="text-gray-500">Confidence</Label>
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${result.receiptData.confidence * 100}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {(result.receiptData.confidence * 100).toFixed(0)}% confident
                        </p>
                      </div>
                    </div>

                    {result.analysis && (
                      <div className="pt-4 border-t">
                        <Label className="text-gray-500">Return Analysis</Label>
                        <p className="text-sm mt-2">
                          <span className={result.analysis.is_returnable ? 'text-green-600' : 'text-red-600'}>
                            {result.analysis.is_returnable ? '✓ Returnable' : '✗ Not returnable'}
                          </span>
                          {result.analysis.days_remaining > 0 && (
                            <span className="text-gray-600">
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
                <div className="text-center py-12 text-gray-500">
                  <p>Results will appear here after processing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
