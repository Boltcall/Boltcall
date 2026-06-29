"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button-shadcn"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CheckIcon, ArrowRightIcon, Loader2 } from "lucide-react"

type Field = {
  label: string
  field: string
  placeholder: string
  type?: string
}

type Step = {
  id: number
  label: string
  fields: Field[]
}

const steps: Step[] = [
  { 
    id: 1, 
    label: "Personal Information",
    fields: [
      { label: "Name", field: "name", placeholder: "Your full name" }
    ]
  },
  { 
    id: 2, 
    label: "Business Information",
    fields: [
      { label: "Business Name", field: "companyName", placeholder: "Your Business Name" },
      { label: "Current Website", field: "website", placeholder: "https://yourwebsite.com or leave blank", type: "url" }
    ]
  },
  { 
    id: 3, 
    label: "Contact Information",
    fields: [
      { label: "Email", field: "email", placeholder: "your@email.com", type: "email" }
    ]
  },
]

interface FreeWebsiteMultiStepFormProps {
  formData: Record<string, string>
  setFormData: (data: Record<string, string>) => void
  allowNotifications: boolean
  setAllowNotifications: (value: boolean) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  isSubmitted: boolean
}

export function FreeWebsiteMultiStepForm({
  formData,
  setFormData,
  allowNotifications,
  setAllowNotifications,
  onSubmit,
  isSubmitting,
  isSubmitted
}: FreeWebsiteMultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = async () => {
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
  
  // Check if all fields in current step are filled
  const isStepComplete = currentStepData.fields.every(field => {
    // Website field is optional
    if (field.field === "website") {
      return true
    }
    return formData[field.field]?.trim()
  })

  if (isSubmitted) {
    return null // Let parent handle success state
  }

  return (
    <div className="w-full free-website-form">
      <style>{`
        .free-website-form input:-webkit-autofill,
        .free-website-form input:-webkit-autofill:hover,
        .free-website-form input:-webkit-autofill:focus,
        .free-website-form input:-webkit-autofill:active,
        .free-website-form input:-webkit-autofill:focus-visible {
          -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
          -webkit-text-fill-color: #ffffff !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
          background-clip: padding-box !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
        .free-website-form input[type="text"],
        .free-website-form input[type="email"],
        .free-website-form input[type="url"] {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .free-website-form input[type="text"]:focus,
        .free-website-form input[type="email"]:focus,
        .free-website-form input[type="url"]:focus,
        .free-website-form input[type="text"]:active,
        .free-website-form input[type="email"]:active,
        .free-website-form input[type="url"]:active,
        .free-website-form input[type="text"]:focus-visible,
        .free-website-form input[type="email"]:focus-visible,
        .free-website-form input[type="url"]:focus-visible {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .free-website-form input {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .free-website-form input:focus,
        .free-website-form input:active,
        .free-website-form input:hover,
        .free-website-form input:focus-visible {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
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
                {field.field === "whyChoose" ? (
                  <div className="relative group">
                    <textarea
                      id={field.field}
                      placeholder={field.placeholder}
                      value={formData[field.field] || ""}
                      onChange={(e) => handleInputChange(field.field, e.target.value)}
                      autoFocus={fieldIndex === 0}
                      rows={6}
                      className="w-full px-4 py-3 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/10 transition-all duration-500 resize-none"
                      style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
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
                      inputClassName="h-12 border-white/30 bg-white/10 text-base text-white focus:bg-white/10"
                      style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {currentStepData.id === 3 && (
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
                  className={`flex items-center justify-center w-5 h-5 rounded border-2 cursor-pointer transition-all ${
                    allowNotifications
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
                I allow you to send me updates about my website application
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 px-6 py-3 bg-white/10 text-white font-semibold rounded-md border border-white/30 hover:bg-white/20 transition-colors"
            >
              Back
            </button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isStepComplete || isSubmitting}
            className={cn(
              "flex-1 h-12 group relative transition-all duration-300 hover:shadow-lg hover:shadow-white/10",
              "bg-white text-brand-blue hover:bg-gray-50",
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
                "Submit Application"
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

