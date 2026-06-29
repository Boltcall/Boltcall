"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button-shadcn"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CheckIcon, ArrowRightIcon, Loader2, ChevronDown } from "lucide-react"

type Field = {
  label: string
  field: string
  placeholder?: string
  type?: string
  options?: string[]
}

type Step = {
  id: number
  label: string
  fields: Field[]
}

const steps: Step[] = [
  {
    id: 1,
    label: "Professional Details",
    fields: [
      { label: "Name", field: "name", placeholder: "Your full name" },
      { 
        label: "Industry", 
        field: "industry", 
        type: "select",
        options: [
          "Real Estate",
          "Healthcare",
          "Legal",
          "E-commerce",
          "Technology",
          "Education",
          "Finance",
          "Construction",
          "Other"
        ]
      }
    ]
  },
  {
    id: 2,
    label: "Funnel Variables",
    fields: []
  },
  {
    id: 3,
    label: "Final Step",
    fields: [
      { label: "Email", field: "email", placeholder: "your@email.com", type: "email" }
    ]
  }
]

interface GiveawayMultiStepFormProps {
  formData: Record<string, string>
  setFormData: (data: Record<string, string>) => void
  allowNotifications: boolean
  setAllowNotifications: (value: boolean) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  isSubmitted: boolean
  step2Extras?: React.ReactNode
  step3Extras?: React.ReactNode
}

export function GiveawayMultiStepForm({
  formData,
  setFormData,
  allowNotifications,
  setAllowNotifications,
  onSubmit,
  isSubmitting,
  isSubmitted,
  step2Extras,
  step3Extras
}: GiveawayMultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = async () => {
    if (!isStepComplete) return
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Last step - submit form
      await onSubmit()
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  // Helper to validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Check if all fields in current step are filled and valid
  const isStepComplete = currentStepData.fields.every(field => {
    const value = formData[field.field]?.trim();
    if (!value) return false;
    if (field.type === 'email') {
      return isValidEmail(value);
    }
    return true;
  });

  if (isSubmitted) {
    return null // Let parent handle success state
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              onClick={() => index < currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
              className={cn(
                "group relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-700 ease-out",
                "disabled:cursor-not-allowed",
                index < currentStep && "bg-white/20 text-white/80",
                index === currentStep && "bg-white text-brand-blue shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]",
                index > currentStep && "bg-white/10 text-white/40",
              )}
            >
              {index < currentStep ? (
                <CheckIcon className="h-3.5 w-3.5 animate-in zoom-in duration-500 text-white" strokeWidth={2.5} />
              ) : (
                <span className="text-xs font-medium tabular-nums">{step.id}</span>
              )}
              {index === currentStep && (
                <div className="absolute inset-0 rounded-full bg-white/30 blur-md animate-pulse" />
              )}
            </button>
            {index < steps.length - 1 && (
              <div className="relative h-[1.5px] w-8">
                <div className="absolute inset-0 bg-white/20" />
                <div
                  className="absolute inset-0 bg-white/60 transition-all duration-700 ease-out origin-left"
                  style={{
                    transform: `scaleX(${index < currentStep ? 1 : 0})`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mb-6 overflow-hidden rounded-full bg-white/20 h-[2px]">
        <div
          className="h-full bg-white transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-6">
        <div key={currentStepData.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="flex items-baseline justify-between">
            <Label className="text-base font-medium tracking-tight text-white">
              {currentStepData.label}
            </Label>
            <span className="text-xs font-medium text-white/60 tabular-nums">
              {currentStep + 1}/{steps.length}
            </span>
          </div>

          <div className="space-y-4">
            {currentStepData.fields.map((field, fieldIndex) => (
              <div key={field.field} className="space-y-2">
                <Label htmlFor={field.field} className="text-sm font-medium tracking-tight text-white/90">
                  {field.label}
                </Label>
                {field.type === "radio" && field.options ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {field.options.map((option) => (
                      <div
                        key={option}
                        onClick={() => handleInputChange(field.field, option)}
                        className={cn(
                          "cursor-pointer rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200",
                          formData[field.field] === option
                            ? "bg-white text-brand-blue border-white shadow-lg"
                            : "bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {formData[field.field] === option && (
                            <CheckIcon className="w-4 h-4 text-brand-blue" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : field.type === "select" && field.options ? (
                  <div className="relative group">
                    <select
                      id={field.field}
                      value={formData[field.field] || ""}
                      onChange={(e) => handleInputChange(field.field, e.target.value)}
                      className={cn(
                        "w-full h-10 px-3 text-sm transition-all duration-500 rounded-md border border-white/30 bg-white/10 backdrop-blur text-white focus:border-white/50 focus:ring-white/30 appearance-none cursor-pointer",
                        !formData[field.field] && "text-white/60"
                      )}
                      style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <option value="" disabled className="bg-blue-700">Select an industry</option>
                      {field.options.map(option => (
                        <option key={option} value={option} className="bg-blue-700 text-white">
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <Input
                      id={field.field}
                      type={field.type || "text"}
                      label={field.placeholder || field.label}
                      placeholder={field.placeholder}
                      value={formData[field.field] || ""}
                      onChange={(e) => handleInputChange(field.field, e.target.value)}
                      autoFocus={fieldIndex === 0}
                      className="w-full"
                      inputClassName="h-10 border-white/30 bg-white/10 text-sm text-white caret-white"
                      style={{ color: '#ffffff', opacity: 1 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {currentStepData.id === 2 && step2Extras && (
            <div className="pt-4 border-t border-white/10">
              {step2Extras}
            </div>
          )}

          {currentStepData.id === 3 && (
            <div className="space-y-6">
              {step3Extras}
              <div className="flex items-start gap-3 mt-4">
                <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  id="allowNotifications"
                  checked={allowNotifications}
                  onChange={(e) => setAllowNotifications(e.target.checked)}
                  className="sr-only"
                />
                <label
                  htmlFor="allowNotifications"
                  className={`flex items-center justify-center w-5 h-5 rounded border-2 cursor-pointer transition-all ${allowNotifications
                    ? 'bg-white border-white'
                    : 'bg-white/10 border-white/40'
                    }`}
                >
                  {allowNotifications && (
                    <CheckIcon className="w-3.5 h-3.5 text-brand-blue" strokeWidth={2.5} />
                  )}
                </label>
              </div>
              <label htmlFor="allowNotifications" className="text-sm text-white/95 cursor-pointer leading-relaxed flex-1">
                I allow you to send me notifications and updates.
              </label>
            </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 px-4 py-2 h-10 text-sm bg-white/10 text-white font-semibold rounded-md border border-white/30 hover:bg-white/20 transition-colors"
            >
              Back
            </button>
          )}
          <Button
            onClick={handleNext}
            className={cn(
              "flex-1 h-10 text-sm group relative transition-all duration-300 hover:shadow-lg hover:shadow-white/10",
              "bg-white text-brand-blue hover:bg-gray-50",
              !isStepComplete && "opacity-60 cursor-not-allowed",
              currentStep === 0 && "w-full"
            )}
          >
            <span className="flex items-center justify-center gap-2 font-medium">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : currentStep === steps.length - 1 ? (
                "Submit"
              ) : (
                <>
                  Continue
                  <ArrowRightIcon
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 duration-300"
                    strokeWidth={2}
                  />
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
