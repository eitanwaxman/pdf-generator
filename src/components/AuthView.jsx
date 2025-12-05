import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { trackLogin, trackSignUp } from '../lib/analytics'

export default function AuthView() {
  const [activeTab, setActiveTab] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const clearMessages = () => {
    setMessage('')
    setError('')
  }

  const handleLogin = async () => {
    clearMessages()
    
    if (!loginEmail || !loginPassword) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) throw error

      setMessage('Login successful! Loading dashboard...')
      trackLogin('email')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    clearMessages()
    
    if (!loginEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: loginEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link')
      }

      setMessage('Magic link sent! Check your email to login.')
      trackLogin('magic_link')
    } catch (err) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    clearMessages()
    
    if (!registerEmail || !registerPassword || !registerPasswordConfirm) {
      setError('Please fill in all fields')
      return
    }

    if (registerPassword !== registerPasswordConfirm) {
      setError('Passwords do not match')
      return
    }

    if (registerPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: registerEmail, password: registerPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setMessage('Account created! Please check your email to verify your account before logging in.')
      trackSignUp('email')
      
      // Switch to login tab
      setTimeout(() => {
        setActiveTab('login')
        setLoginEmail(registerEmail)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Docuskribe Dashboard</CardTitle>
        <CardDescription>Sign in to access your API key and generate PDFs</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          clearMessages()
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginEmail">Email</Label>
              <Input
                id="loginEmail"
                type="email"
                placeholder="your@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && loginEmail && !loginPassword) {
                    handleMagicLink()
                  } else if (e.key === 'Enter' && loginPassword) {
                    handleLogin()
                  }
                }}
              />
            </div>
            
            {loginEmail && (
              <>
                <Button
                  variant="outline"
                  onClick={handleMagicLink}
                  disabled={loading}
                  className="w-full"
                >
                  Send Magic Link
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                
                <Button
                  onClick={handleLogin}
                  disabled={loading || !loginPassword}
                  className="w-full"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registerEmail">Email</Label>
              <Input
                id="registerEmail"
                type="email"
                placeholder="your@email.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && registerEmail && registerPassword && registerPasswordConfirm) {
                    handleRegister()
                  }
                }}
              />
            </div>
            
            {registerEmail && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="registerPassword">Password</Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    placeholder="Min 8 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerPasswordConfirm">Confirm Password</Label>
                  <Input
                    id="registerPasswordConfirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={registerPasswordConfirm}
                    onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                </div>
                <Button
                  onClick={handleRegister}
                  disabled={loading || !registerPassword || !registerPasswordConfirm}
                  className="w-full"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  By registering, you'll get a free API key with 50 requests per day.
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>

        {message && (
          <Alert className="mt-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

