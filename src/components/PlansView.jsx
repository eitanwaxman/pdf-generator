import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import PlanCard from './PlanCard'

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    credits: 100,
    features: [
      'All API features',
      '100 credits per month',
      'Watermarked PDFs',
      'Email support',
      'Full documentation'
    ]
  },
  starter: {
    name: 'Starter',
    price: 9,
    credits: 1000,
    features: [
      'All API features',
      '1,000 credits per month',
      'No watermark',
      'Priority email support',
      'Optional overage',
      'Full documentation'
    ]
  },
  pro: {
    name: 'Pro',
    price: 25,
    credits: 5000,
    features: [
      'All API features',
      '5,000 credits per month',
      'No watermark',
      'Priority support',
      'Optional overage',
      'Full documentation',
      'Priority processing queue'
    ]
  }
}

export default function PlansView({ session, profile, onSubscriptionFound }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const currentTier = profile?.tier || 'free'
  
  const handleSelectPlan = async (tier) => {
    if (tier === 'free') {
      setError('Cannot downgrade to free plan. Please cancel your subscription in Settings.')
      return
    }
    
    if (tier === currentTier && currentTier !== 'free') {
      setMessage('You are already on this plan.')
      return
    }
    
    setLoading(true)
    setMessage('')
    setError('')
    
    try {
      const response = await fetch('/api/v1/user/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // If the error indicates a subscription already exists, trigger the callback
        if (data.error === 'Subscription exists' && onSubscriptionFound) {
          onSubscriptionFound()
          return
        }
        
        // Show friendly error message
        if (data.message) {
          throw new Error(data.message)
        }
        throw new Error(data.error || 'Failed to initiate checkout')
      }
      
      // Check if this was a plan update (upgrade/downgrade)
      if (data.updated) {
        setMessage(data.message || `Successfully changed to ${tier} plan`)
        setLoading(false)
        
        // Refresh the page to show updated plan
        setTimeout(() => {
          window.location.reload()
        }, 1500)
        return
      }
      
      // Redirect to Stripe Checkout for new subscriptions
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage('Checkout session created but no URL returned')
        setLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to select plan')
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plans & Pricing</CardTitle>
          <CardDescription>
            Choose the plan that fits your needs. All plans include full API access.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(PLANS).map(([tier, plan]) => {
          const isCurrentPlan = currentTier === tier
          
          // Determine if this is an upgrade or downgrade
          const tierOrder = { free: 0, starter: 1, pro: 2 }
          const currentTierOrder = tierOrder[currentTier] || 0
          const thisTierOrder = tierOrder[tier] || 0
          const isUpgrade = thisTierOrder > currentTierOrder
          const isDowngrade = thisTierOrder < currentTierOrder && tier !== 'free'
          
          return (
            <PlanCard
              key={tier}
              name={plan.name}
              price={plan.price}
              credits={plan.credits}
              features={plan.features}
              isCurrentPlan={isCurrentPlan}
              isUpgrade={isUpgrade}
              isDowngrade={isDowngrade}
              onSelect={() => handleSelectPlan(tier)}
              loading={loading}
              disabled={false}
            />
          )
        })}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Overage Pricing</CardTitle>
          <CardDescription>
            Need more credits? Enable overage in settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Starter overage:</span>
              <span className="font-medium">$0.009 per credit</span>
            </div>
            <div className="flex justify-between">
              <span>Pro overage:</span>
              <span className="font-medium">$0.005 per credit</span>
            </div>
            <p className="text-muted-foreground text-xs mt-4">
              Overage charges are billed at the end of each month. You can toggle overage on/off in Settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

