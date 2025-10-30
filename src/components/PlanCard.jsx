import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Check } from 'lucide-react'

export default function PlanCard({ 
  name, 
  price, 
  credits, 
  features, 
  isCurrentPlan,
  isUpgrade = false,
  isDowngrade = false,
  onSelect,
  loading,
  disabled = false
}) {
  const getButtonText = () => {
    if (loading) return 'Processing...'
    if (isCurrentPlan) return 'Current Plan'
    if (isUpgrade) return `Upgrade to ${name}`
    if (isDowngrade) return `Downgrade to ${name}`
    return 'Select Plan'
  }
  
  const getButtonVariant = () => {
    if (isCurrentPlan) return 'outline'
    if (isUpgrade) return 'default'
    if (isDowngrade) return 'outline'
    return 'default'
  }
  return (
    <Card className={`relative ${isCurrentPlan ? 'border-primary border-2' : ''}`}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
            Current Plan
          </span>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">${price}</span>
          {price > 0 && <span className="text-muted-foreground">/month</span>}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-semibold text-lg">{credits}</span>
            <span className="text-muted-foreground"> credits/month</span>
          </div>
          {price > 0 && (
            <div className="text-xs text-muted-foreground">
              ${(price / credits).toFixed(3)} per credit
            </div>
          )}
        </div>
        
        <ul className="space-y-2 py-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button
          onClick={onSelect}
          disabled={isCurrentPlan || loading || disabled}
          className="w-full"
          variant={getButtonVariant()}
        >
          {getButtonText()}
        </Button>
        
        {isUpgrade && !isCurrentPlan && (
          <p className="text-xs text-muted-foreground text-center -mt-2">
            Only pay the prorated difference
          </p>
        )}
        
        {isDowngrade && !isCurrentPlan && (
          <p className="text-xs text-muted-foreground text-center -mt-2">
            Receive prorated credit
          </p>
        )}
      </CardContent>
    </Card>
  )
}

