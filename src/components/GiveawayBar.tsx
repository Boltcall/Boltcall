import { Banner } from "@/components/ui/banner"
import { Button } from "@/components/ui/button"
import { Gift, X } from "lucide-react"
import { useEffect, useState } from "react"

interface GiveawayBarProps {
  endDate: Date
  title?: string
  description?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

function GiveawayBar({
  endDate,
  title = "Giveaway is live!",
  description = "Enter now before time runs out.",
  ctaLabel = "Enter now",
  onCtaClick,
}: GiveawayBarProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endDate.getTime() - Date.now()

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false,
      })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [endDate])

  if (!isVisible || timeLeft.isExpired) return null

  return (
    <Banner variant="muted" className="dark text-foreground">
      <div className="flex w-full gap-2 md:items-center">
        <div className="flex grow gap-3 md:items-center">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 max-md:mt-0.5"
            aria-hidden="true"
          >
            <Gift className="opacity-80" size={16} strokeWidth={2} />
          </div>
          <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex gap-3 max-md:flex-wrap">
              <div className="flex items-center divide-x divide-primary-foreground rounded-lg bg-primary/15 text-sm tabular-nums">
                {timeLeft.days > 0 && (
                  <span className="flex h-8 items-center justify-center p-2">
                    {timeLeft.days}
                    <span className="text-muted-foreground">d</span>
                  </span>
                )}
                <span className="flex h-8 items-center justify-center p-2">
                  {timeLeft.hours.toString().padStart(2, "0")}
                  <span className="text-muted-foreground">h</span>
                </span>
                <span className="flex h-8 items-center justify-center p-2">
                  {timeLeft.minutes.toString().padStart(2, "0")}
                  <span className="text-muted-foreground">m</span>
                </span>
                <span className="flex h-8 items-center justify-center p-2">
                  {timeLeft.seconds.toString().padStart(2, "0")}
                  <span className="text-muted-foreground">s</span>
                </span>
              </div>
              <Button size="sm" className="text-sm" onClick={onCtaClick}>
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
          onClick={() => setIsVisible(false)}
          aria-label="Close banner"
        >
          <X
            size={16}
            strokeWidth={2}
            className="opacity-60 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </Button>
      </div>
    </Banner>
  )
}

export { GiveawayBar }
