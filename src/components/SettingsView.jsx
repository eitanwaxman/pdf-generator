import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { AlertCircle, Trash2, CreditCard } from 'lucide-react'
import Switch from './ui/switch'
import ApiKeyCard from './ApiKeyCard'

export default function SettingsView({ session, profile, emailVerified, onAccountDeleted, onRefresh }) {
  const [overageEnabled, setOverageEnabled] = useState(profile?.overage_enabled || false)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')
  const [overageError, setOverageError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)
  
  const handleOverageChange = async (nextValue) => {
    setLoading(true)
    setMessage('')
    setOverageError('')
    
    try {
      const response = await fetch('/api/v1/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ overage_enabled: nextValue })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }
      
      setOverageEnabled(nextValue)
      setMessage('Overage settings updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setOverageError(err.message || 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion')
      return
    }
    
    setDeleting(true)
    setDeleteError('')
    
    try {
      const response = await fetch('/api/v1/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }
      
      // Call the callback to handle account deletion (sign out, etc.)
      if (onAccountDeleted) {
        onAccountDeleted()
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }
  
  const isPaidPlan = profile?.tier === 'starter' || profile?.tier === 'pro'
  
  // Fetch subscription details on mount
  useEffect(() => {
    fetchSubscription()
  }, [])
  
  const fetchSubscription = async () => {
    setSubscriptionLoading(true)
    try {
      const response = await fetch('/api/v1/user/subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSubscription(data.subscription)
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      setSubscriptionLoading(false)
    }
  }
  
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return
    }
    
    setCancelingSubscription(true)
    setSubscriptionError('')
    setMessage('')
    
    try {
      const response = await fetch('/api/v1/user/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }
      
      setMessage('Subscription will be canceled at the end of the billing period')
      await fetchSubscription() // Refresh subscription data
      if (onRefresh) onRefresh() // Refresh parent profile data
    } catch (err) {
      setSubscriptionError(err.message || 'Failed to cancel subscription')
    } finally {
      setCancelingSubscription(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* API Key Management */}
      <ApiKeyCard session={session} emailVerified={emailVerified} />
      
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details and subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span className="col-span-2 font-medium">{session?.user?.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">Current Plan:</span>
              <span className="col-span-2 font-medium capitalize">{profile?.tier || 'free'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-muted-foreground">Monthly Credits:</span>
              <span className="col-span-2 font-medium">{profile?.monthly_credits || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                fetchSubscription()
                if (onRefresh) onRefresh()
              }}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionLoading ? (
            <p className="text-sm text-muted-foreground">Loading subscription details...</p>
          ) : subscription ? (
            <>
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="col-span-2 font-medium capitalize">{subscription.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Next Billing Date:</span>
                  <span className="col-span-2 font-medium">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                {subscription.cancel_at_period_end && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription is set to cancel on {subscription.current_period_end 
                        ? new Date(subscription.current_period_end).toLocaleDateString() 
                        : 'the end of the period'}. 
                      You will retain access until then and be downgraded to the free plan afterwards.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {!subscription.cancel_at_period_end && (
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={cancelingSubscription}
                  className="w-full"
                >
                  {cancelingSubscription ? 'Canceling...' : 'Cancel Subscription'}
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription found</p>
          )}
          {subscriptionError && (
            <Alert variant="destructive">
              <AlertDescription>{subscriptionError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Overage Settings (only for paid plans) */}
      {isPaidPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Overage Settings</CardTitle>
            <CardDescription>
              Allow usage beyond your monthly credit limit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="overageToggle">Enable Overage</Label>
                <p className="text-sm text-muted-foreground">
                  Continue using credits after your monthly limit is reached
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="overageToggle"
                  aria-label="Enable overage"
                  checked={overageEnabled}
                  disabled={loading}
                  onCheckedChange={async (next) => {
                    if (next && !overageEnabled) {
                      const price = profile?.tier === 'pro' ? '0.005' : '0.009'
                      const confirmed = confirm(`Enable overage? You may be charged ${price} USD per credit for usage beyond your monthly limit. You can turn this off anytime.`)
                      if (!confirmed) return
                    }
                    if (!next && overageEnabled) {
                      const confirmed = confirm('Disable overage? Usage will stop when you hit your monthly limit.')
                      if (!confirmed) return
                    }
                    await handleOverageChange(next)
                  }}
                />
                <span className="text-sm">{loading ? 'Saving…' : (overageEnabled ? 'On' : 'Off')}</span>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Overage credits {overageEnabled ? 'are' : 'will be'} charged at ${profile?.tier === 'pro' ? '0.005' : '0.009'} per credit. Billed monthly.
              </AlertDescription>
            </Alert>
            
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            {overageError && (
              <Alert variant="destructive">
                <AlertDescription>{overageError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. All your data, API keys, and usage history will be permanently deleted.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="deleteConfirm">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <input
              id="deleteConfirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md"
              placeholder="DELETE"
              disabled={deleting}
            />
          </div>
          
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== 'DELETE'}
            className="w-full"
          >
            {deleting ? 'Deleting Account...' : 'Delete Account Permanently'}
          </Button>
          
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

