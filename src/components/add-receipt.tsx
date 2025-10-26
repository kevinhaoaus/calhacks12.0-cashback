'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/file-upload'
import { ReceiptConfirmationDialog } from '@/components/receipt-confirmation-dialog'
import { LoadingProgress, LoadingStep } from '@/components/ui/loading-progress'
import { Upload, FileText, Loader2 } from 'lucide-react'

interface ReceiptData {
  merchant: string
  date: string
  total: number
  currency: string
  items: Array<{
    name: string
    price: number
    quantity: number
  }>
  confidence: number
}

export function AddReceipt() {
  const [receiptText, setReceiptText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([])
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setError('')
    setProcessing(true)

    // Initialize loading steps
    const steps: LoadingStep[] = [
      { label: 'Uploading image...', status: 'in_progress' },
      { label: 'Extracting text...', status: 'pending' },
      { label: 'Analyzing data...', status: 'pending' },
    ]
    setLoadingSteps(steps)

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Step 1: Upload
      const response = await fetch('/api/upload-receipt', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        setProcessing(false)
        return
      }

      // Update to step 2
      steps[0].status = 'completed'
      steps[1].status = 'in_progress'
      setLoadingSteps([...steps])

      const data = await response.json()

      // Step 3: Complete
      steps[1].status = 'completed'
      steps[2].status = 'in_progress'
      setLoadingSteps([...steps])

      await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause for UX

      if (response.ok && data.extractedData) {
        steps[2].status = 'completed'
        setLoadingSteps([...steps])

        await new Promise(resolve => setTimeout(resolve, 300)) // Show success

        setExtractedData(data.extractedData)
        setShowConfirmation(true)
      } else {
        steps[2].status = 'error'
        setLoadingSteps([...steps])

        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details
            .map((detail: { field: string; message: string }) =>
              `${detail.field}: ${detail.message}`
            )
            .join(', ')
          setError(`${data.error || 'Validation failed'}: ${errorMessages}`)
        } else {
          setError(data.error || 'Failed to process receipt')
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Upload canceled')
      } else {
        console.error('Upload failed:', err)
        const currentStep = steps.findIndex(s => s.status === 'in_progress')
        if (currentStep >= 0) {
          steps[currentStep].status = 'error'
          setLoadingSteps([...steps])
        }
        setError('Failed to upload and process receipt')
      }
    } finally {
      setProcessing(false)
      setAbortController(null)
    }
  }

  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      setProcessing(false)
      setLoadingSteps([])
    }
  }

  const handleTextSubmit = async () => {
    if (!receiptText.trim()) {
      setError('Please paste receipt text')
      return
    }

    setError('')
    setProcessing(true)

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptText,
          extractOnly: true, // Just extract, don't save
        }),
      })

      const data = await response.json()

      if (response.ok && data.extractedData) {
        setExtractedData(data.extractedData)
        setShowConfirmation(true)
      } else {
        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details
            .map((detail: { field: string; message: string }) =>
              `${detail.field}: ${detail.message}`
            )
            .join(', ')
          setError(`${data.error || 'Validation failed'}: ${errorMessages}`)
        } else {
          setError(data.error || 'Failed to extract receipt data')
        }
      }
    } catch (err) {
      console.error('Processing failed:', err)
      setError('Failed to process receipt text')
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmReceipt = async (confirmedData: ReceiptData) => {
    try {
      // Save to database
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptData: confirmedData,
          skipExtraction: true, // We already have the extracted data
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Save receipt error:', data)
        throw new Error(data.error || 'Failed to save receipt')
      }

      // Success! Dialog will handle the UI feedback and page reload
    } catch (error) {
      console.error('Error in handleConfirmReceipt:', error)
      throw error // Re-throw so dialog can handle it
    }
  }

  const handleCancelConfirmation = () => {
    setExtractedData(null)
    setShowConfirmation(false)
    setReceiptText('')
    setSelectedFile(null)
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[rgba(55,50,47,0.05)]">
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-white data-[state=active]:text-[#37322F] font-sans"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image/PDF
            </TabsTrigger>
            <TabsTrigger
              value="text"
              className="data-[state=active]:bg-white data-[state=active]:text-[#37322F] font-sans"
            >
              <FileText className="w-4 h-4 mr-2" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4 mt-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              accept="image/*,.pdf"
              label="Upload a receipt photo or PDF"
              allowCamera={true}
            />

            {processing && loadingSteps.length > 0 && (
              <LoadingProgress
                steps={loadingSteps}
                estimatedTime={15}
                onCancel={handleCancel}
              />
            )}

            {selectedFile && !processing && (
              <p className="text-sm text-[#16A34A] font-sans">
                ✓ File uploaded: {selectedFile.name}
              </p>
            )}
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="receipt-text" className="text-[#37322F] font-sans">
                Paste receipt text
              </Label>
              <Textarea
                id="receipt-text"
                placeholder={`Paste your receipt text here. Example:

Target
123 Main St
City, ST 12345

Item 1         $10.99
Item 2         $24.99
Tax            $2.88
Total          $38.86

Date: 01/15/2024`}
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                className="min-h-[200px] border-[#E0DEDB] focus:border-[#37322F] focus:ring-[#37322F] font-mono text-sm font-sans"
                disabled={processing}
              />
            </div>

            <Button
              onClick={handleTextSubmit}
              disabled={processing || !receiptText.trim()}
              className="w-full bg-[#37322F] hover:bg-[#2A2520] text-white font-sans"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Receipt'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-[#B44D12] bg-[#FEF3F2] border border-[#FECDCA] rounded-lg font-sans">
            {error}
          </div>
        )}

        {/* Helper Text */}
        <div className="bg-[rgba(55,50,47,0.05)] p-4 rounded-lg">
          <p className="text-sm text-[#605A57] font-sans mb-2">
            <span className="font-semibold text-[#37322F]">💡 Tip:</span> For best results:
          </p>
          <ul className="text-sm text-[#605A57] list-disc list-inside space-y-1 font-sans">
            <li>Take clear, well-lit photos of receipts</li>
            <li>Include merchant name, date, items, and total</li>
            <li>You can review and edit all details before saving</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ReceiptConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        receiptData={extractedData}
        onConfirm={handleConfirmReceipt}
        onCancel={handleCancelConfirmation}
      />
    </>
  )
}
