'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, Circle } from 'lucide-react'

export interface LoadingStep {
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
}

interface LoadingProgressProps {
  steps: LoadingStep[]
  estimatedTime?: number
  onCancel?: () => void
}

/**
 * Multi-step loading progress indicator
 * Shows users what's happening during long AI operations
 */
export function LoadingProgress({
  steps,
  estimatedTime,
  onCancel
}: LoadingProgressProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!estimatedTime) return

    const timer = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [estimatedTime])

  const currentStepIndex = steps.findIndex(s => s.status === 'in_progress')
  const hasError = steps.some(s => s.status === 'error')
  const allComplete = steps.every(s => s.status === 'completed')

  return (
    <div className="space-y-6 p-6">
      {/* Main spinner/check */}
      <div className="flex items-center justify-center">
        {hasError ? (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">✗</span>
          </div>
        ) : allComplete ? (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
        ) : (
          <Loader2 className="w-12 h-12 animate-spin text-[#37322F]" />
        )}
      </div>

      {/* Steps list */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            {/* Step icon */}
            <div className="flex-shrink-0">
              {step.status === 'completed' ? (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : step.status === 'in_progress' ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#37322F]" />
              ) : step.status === 'error' ? (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs">✗</span>
                </div>
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>

            {/* Step label */}
            <span className={`text-sm font-sans ${
              step.status === 'completed' ? 'text-green-600' :
              step.status === 'in_progress' ? 'text-[#37322F] font-medium' :
              step.status === 'error' ? 'text-red-600' :
              'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Time estimate */}
      {estimatedTime && !allComplete && !hasError && (
        <div className="text-center">
          <p className="text-sm text-[#605A57] font-sans">
            Estimated time remaining: {Math.max(0, estimatedTime - elapsed)}s
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-[#37322F] h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (elapsed / estimatedTime) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Cancel button */}
      {onCancel && !allComplete && !hasError && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-sm text-[#605A57] hover:text-[#37322F] underline font-sans"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-sans">
            Something went wrong. Please try again.
          </p>
        </div>
      )}

      {/* Success message */}
      {allComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-sans text-center">
            ✓ Complete!
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Simplified loading spinner for quick operations
 */
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#37322F]" />
      <p className="text-sm text-[#605A57] font-sans">{message}</p>
    </div>
  )
}

/**
 * Inline loading indicator for buttons
 */
export function ButtonLoading() {
  return (
    <Loader2 className="w-4 h-4 animate-spin" />
  )
}
