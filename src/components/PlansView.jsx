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

export default function PlansView({ session, profile }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const currentTier = profile?.tier || 'free'
  
  const handleSelectPlan = async (tier) => {
    if (tier === 'free') {
      setError('Cannot downgrade to free plan. Please contact support.')
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
        throw new Error(data.error || 'Failed to initiate checkout')
      }
      
      setMessage(data.note || 'Stripe integration coming soon!')
    } catch (err) {
      setError(err.message || 'Failed to select plan')
    } finally {
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
        {Object.entries(PLANS).map(([tier, plan]) => (
          <PlanCard
            key={tier}
            name={plan.name}
            price={plan.price}
            credits={plan.credits}
            features={plan.features}
            isCurrentPlan={currentTier === tier}
            onSelect={() => handleSelectPlan(tier)}
            loading={loading}
          />
        ))}
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

