import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthView from './components/AuthView'
import DashboardView from './components/DashboardView'
import DocsView from './components/DocsView'
import PlansView from './components/PlansView'
import SettingsView from './components/SettingsView'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Button } from './components/ui/button'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [apiKey, setApiKey] = useState(null)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        loadUserData(session)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadUserData(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (session) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Load profile
      const response = await fetch('/api/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }

      // Load API key
      const keyResponse = await fetch('/api/v1/user/api-key', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (keyResponse.ok) {
        const keyData = await keyResponse.json()
        setApiKey(keyData.api_key.key)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setApiKey(null)
    setActiveTab('dashboard')
  }

  const handleAccountDeleted = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setApiKey(null)
    setActiveTab('dashboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Not logged in - show auth or public docs
  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="auth">Sign In</TabsTrigger>
              <TabsTrigger value="docs">API Docs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="auth">
              <AuthView />
            </TabsContent>
            
            <TabsContent value="docs">
              <DocsView isLoggedIn={false} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Logged in - show full dashboard with tabs
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">PDF Generator API</h1>
            <p className="text-muted-foreground">
              {user?.email} • {profile?.tier ? (
                <span className="capitalize">{profile.tier} Plan</span>
              ) : 'Loading...'}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="docs">API Docs</TabsTrigger>
            <TabsTrigger value="plans">
              Plans
              {profile?.tier === 'free' && (
                <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                  Upgrade
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardView session={session} profile={profile} apiKey={apiKey} user={user} />
          </TabsContent>

          <TabsContent value="docs">
            <DocsView apiKey={apiKey} isLoggedIn={true} />
          </TabsContent>

          <TabsContent value="plans">
            <PlansView session={session} profile={profile} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsView 
              session={session} 
              profile={profile} 
              emailVerified={!!user?.email_confirmed_at}
              onAccountDeleted={handleAccountDeleted}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App

