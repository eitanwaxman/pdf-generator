import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { AlertCircle, Trash2 } from 'lucide-react'
import ApiKeyCard from './ApiKeyCard'

export default function SettingsView({ session, profile, emailVerified, onAccountDeleted }) {
  const [overageEnabled, setOverageEnabled] = useState(profile?.overage_enabled || false)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const handleOverageToggle = async () => {
    setLoading(true)
    setMessage('')
    setError('')
    
    try {
      const newValue = !overageEnabled
      
      const response = await fetch('/api/v1/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ overage_enabled: newValue })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }
      
      setOverageEnabled(newValue)
      setMessage('Overage settings updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion')
      return
    }
    
    setDeleting(true)
    setError('')
    
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
      setError(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }
  
  const isPaidPlan = profile?.tier === 'starter' || profile?.tier === 'pro'
  
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
                <Label>Enable Overage</Label>
                <p className="text-sm text-muted-foreground">
                  Continue using credits after your monthly limit is reached
                </p>
              </div>
              <Button
                variant={overageEnabled ? 'default' : 'outline'}
                onClick={handleOverageToggle}
                disabled={loading}
              >
                {loading ? 'Updating...' : overageEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            
            {overageEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Overage credits will be charged at ${profile?.tier === 'pro' ? '0.005' : '0.009'} per credit
                </AlertDescription>
              </Alert>
            )}
            
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
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

