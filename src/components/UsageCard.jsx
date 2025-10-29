import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { AlertCircle } from 'lucide-react'

export default function UsageCard({ profile }) {
  if (!profile) return null

  const { monthly_credits, credits_used, subscription_period_start, tier } = profile
  const creditsRemaining = Math.max(0, monthly_credits - credits_used)
  const usagePercentage = (credits_used / monthly_credits) * 100
  
  // Calculate next reset date (30 days from subscription_period_start)
  const resetDate = new Date(subscription_period_start)
  resetDate.setDate(resetDate.getDate() + 30)
  const daysUntilReset = Math.ceil((resetDate - new Date()) / (1000 * 60 * 60 * 24))
  
  // Determine progress bar color based on usage
  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'bg-destructive'
    if (usagePercentage >= 75) return 'bg-warning'
    return 'bg-primary'
  }
  
  const showWarning = usagePercentage >= 75

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Usage</CardTitle>
        <CardDescription>
          Your monthly credit allocation and usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credits used</span>
            <span className="font-medium">
              {credits_used} / {monthly_credits}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{creditsRemaining} credits remaining</span>
            <span>Resets in {daysUntilReset} days</span>
          </div>
        </div>
        
        {showWarning && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">
              {usagePercentage >= 90 
                ? 'You are running low on credits. Consider upgrading your plan.'
                : 'You have used most of your monthly credits.'
              }
            </p>
          </div>
        )}
        
        {tier === 'free' && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <strong>Free Plan:</strong> PDFs include a watermark. Upgrade to remove it.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

