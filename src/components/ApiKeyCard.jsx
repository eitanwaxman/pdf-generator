import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, RefreshCw, Trash2, Key } from 'lucide-react'

export default function ApiKeyCard({ session, emailVerified }) {
  const [apiKey, setApiKey] = useState('')
  const [actualApiKey, setActualApiKey] = useState('') // Store actual key for copying
  const [lastUsed, setLastUsed] = useState('Never')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (emailVerified) {
      loadApiKey()
    } else {
      setApiKey('Please verify your email to access your API key')
      setLoading(false)
    }
  }, [session, emailVerified])

  const loadApiKey = async () => {
    try {
      const response = await fetch('/api/v1/user/api-key', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          setApiKey('Please verify your email to access your API key')
          setHasApiKey(false)
          return
        }
        throw new Error('Failed to load API key')
      }

      const data = await response.json()
      
      if (!data.api_key) {
        // No API key exists
        setHasApiKey(false)
        setApiKey('')
        setLastUsed('Never')
      } else {
        // API key exists (but we don't have the actual key value, only metadata)
        setHasApiKey(true)
        setApiKey('••••••••••••••••••••••••••••••••') // Masked display
        
        if (data.api_key.last_used_at) {
          const date = new Date(data.api_key.last_used_at)
          setLastUsed(date.toLocaleString())
        } else {
          setLastUsed('Never')
        }
      }
    } catch (error) {
      console.error('Error loading API key:', error)
      setMessage('Failed to load API key')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      // Use actual key if available, otherwise use displayed key
      const keyToCopy = actualApiKey || apiKey
      await navigator.clipboard.writeText(keyToCopy)
      setCopySuccess(true)
      setMessage('API key copied to clipboard!')
      setTimeout(() => {
        setCopySuccess(false)
        setMessage('')
      }, 3000)
    } catch (error) {
      setMessage('Failed to copy API key')
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setMessage('')
    try {
      const response = await fetch('/api/v1/user/api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create API key')
      }

      const data = await response.json()
      const newKey = data.api_key.key
      setActualApiKey(newKey) // Store actual key for copying
      setApiKey(newKey) // Show the actual key once
      setHasApiKey(true)
      setLastUsed('Never')
      setMessage('API key created successfully! Make sure to copy it now - you won\'t be able to see it again.')
      setTimeout(() => {
        setMessage('')
        // After showing the key once, mask it (but keep actual key for copying)
        setApiKey('••••••••••••••••••••••••••••••••')
      }, 10000) // Show for 10 seconds
    } catch (error) {
      setMessage(error.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your API key? This action cannot be undone and your current key will stop working immediately.')) {
      return
    }

    setDeleting(true)
    setMessage('')
    try {
      const response = await fetch('/api/v1/user/api-key', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete API key')
      }

      setApiKey('')
      setActualApiKey('') // Clear actual key
      setHasApiKey(false)
      setLastUsed('Never')
      setMessage('API key deleted successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error.message || 'Failed to delete API key')
    } finally {
      setDeleting(false)
    }
  }

  const handleRotate = async () => {
    if (!confirm('Are you sure you want to rotate your API key? Your old key will stop working immediately.')) {
      return
    }

    setRotating(true)
    setMessage('')
    try {
      const response = await fetch('/api/v1/user/api-key/rotate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to rotate API key')

      const data = await response.json()
      const newKey = data.api_key.key
      setActualApiKey(newKey) // Store actual key for copying
      setApiKey(newKey) // Show the actual key once
      setLastUsed('Never')
      setMessage('API key rotated successfully! Make sure to copy it now - you won\'t be able to see it again.')
      setTimeout(() => {
        setMessage('')
        // After showing the key once, mask it (but keep actual key for copying)
        setApiKey('••••••••••••••••••••••••••••••••')
      }, 10000) // Show for 10 seconds
    } catch (error) {
      setMessage(error.message || 'Failed to rotate API key')
    } finally {
      setRotating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your API Key</CardTitle>
          <CardDescription>
            Use this key to authenticate your API requests via the <code className="bg-muted px-1 py-0.5 rounded text-xs">x-api-key</code> header
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!hasApiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your API Key</CardTitle>
          <CardDescription>
            Create an API key to authenticate your API requests via the <code className="bg-muted px-1 py-0.5 rounded text-xs">x-api-key</code> header
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You don't have an API key yet. Click the button below to create one.
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleCreate}
            disabled={!emailVerified || creating}
            className="w-full"
          >
            <Key className="h-4 w-4 mr-2" />
            {creating ? 'Creating...' : 'Create API Key'}
          </Button>

          {message && (
            <Alert variant={message.includes('Failed') ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your API Key</CardTitle>
        <CardDescription>
          Use this key to authenticate your API requests via the <code className="bg-muted px-1 py-0.5 rounded text-xs">x-api-key</code> header
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            value={apiKey}
            readOnly
            disabled={!emailVerified}
            className="font-mono bg-muted"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!emailVerified || loading || (!actualApiKey && apiKey.startsWith('••••'))}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copySuccess ? 'Copied!' : 'Copy API Key'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              disabled={!emailVerified || loading || rotating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${rotating ? 'animate-spin' : ''}`} />
              Rotate Key
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={!emailVerified || loading || deleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Last used: {lastUsed}
          </p>
        </div>

        {message && (
          <Alert variant={message.includes('Failed') ? 'destructive' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

