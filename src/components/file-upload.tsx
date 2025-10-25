'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  label?: string
  allowCamera?: boolean
}

export function FileUpload({
  onFileSelect,
  accept = 'image/*',
  label = 'Upload Receipt',
  allowCamera = false
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      onFileSelect(file)
    }
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleFileClick}
          className="flex-1"
        >
          Choose File
        </Button>

        {allowCamera && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraClick}
            className="flex-1"
          >
            📷 Take Photo
          </Button>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {allowCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-4 border rounded-lg p-4">
          <Label className="text-sm text-gray-500">Preview</Label>
          <img
            src={preview}
            alt="Receipt preview"
            className="mt-2 max-w-full h-auto max-h-64 object-contain rounded"
          />
        </div>
      )}
    </div>
  )
}
