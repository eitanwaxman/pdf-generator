import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, RefreshCw } from 'lucide-react'

export default function ApiKeyCard({ session, emailVerified }) {
  const [apiKey, setApiKey] = useState('')
  const [lastUsed, setLastUsed] = useState('Never')
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
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
          return
        }
        throw new Error('Failed to load API key')
      }

      const data = await response.json()
      setApiKey(data.api_key.key)
      
      if (data.api_key.last_used_at) {
        const date = new Date(data.api_key.last_used_at)
        setLastUsed(date.toLocaleString())
      } else {
        setLastUsed('Never')
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
      await navigator.clipboard.writeText(apiKey)
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

  const handleRotate = async () => {
    if (!confirm('Are you sure you want to rotate your API key? Your old key will stop working immediately.')) {
      return
    }

    setRotating(true)
    try {
      const response = await fetch('/api/v1/user/api-key/rotate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to rotate API key')

      const data = await response.json()
      setApiKey(data.api_key.key)
      setLastUsed('Never')
      setMessage('API key rotated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error.message || 'Failed to rotate API key')
    } finally {
      setRotating(false)
    }
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
              disabled={!emailVerified || loading}
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

