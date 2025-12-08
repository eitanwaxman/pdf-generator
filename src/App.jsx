import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import AuthView from './components/AuthView'
import DashboardView from './components/DashboardView'
import DocsView from './components/DocsView'
import PlansView from './components/PlansView'
import SettingsView from './components/SettingsView'
import WidgetConfigView from './components/WidgetConfigView'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Button } from './components/ui/button'
import { Alert, AlertDescription } from './components/ui/alert'
import { CheckCircle, XCircle } from 'lucide-react'
import LandingView from './components/LandingView'
import WixLandingView from './components/WixLandingView'
import WixDocsView from './components/WixDocsView'
import SEO from './components/SEO'
import StructuredData, {
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateWebSiteSchema,
  generateBreadcrumbSchema,
} from './components/StructuredData'
import { trackPageView, trackPurchase } from './lib/analytics'

const BASE_URL = 'https://docuskribe.com'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Initialize activeTab from URL pathname immediately
  const pathToTab = (pathname) => {
    if (pathname.startsWith('/wix/docs')) return 'wix-docs'
    if (pathname.startsWith('/wix')) return 'wix'
    if (pathname.startsWith('/dashboard')) return 'dashboard'
    if (pathname.startsWith('/docs')) return 'docs'
    if (pathname.startsWith('/plans')) return 'plans'
    if (pathname.startsWith('/settings')) return 'settings'
    if (pathname.startsWith('/widget')) return 'widget'
    if (pathname.startsWith('/auth')) return 'auth'
    return 'landing'
  }
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      // Always prioritize URL path over localStorage for initial state
      const tabFromPath = pathToTab(window.location.pathname)
      return tabFromPath || 'landing'
    }
    return 'landing'
  })
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [apiKey, setApiKey] = useState(null)
  const [demoKey, setDemoKey] = useState(null)
  const [checkoutStatus, setCheckoutStatus] = useState(null)
  const hasInitialSessionRef = useRef(false)

  useEffect(() => {
    // Initialize tab from path, prioritizing URL over localStorage
    const pathname = window.location.pathname
    const initialTabFromPath = pathToTab(pathname)
    
    // Always prioritize URL path - if path specifies a tab, use it
    // This ensures direct navigation to /docs/wix, etc. works correctly
    if (initialTabFromPath) {
      // Always respect the URL path for direct navigation, even if it matches current tab
      // This is important for subroutes like /docs/wix
      if (initialTabFromPath !== activeTab) {
        setActiveTab(initialTabFromPath)
      }
    } else {
      // Only use localStorage if path doesn't specify a tab (e.g., root path)
      // Never use localStorage if we're on a specific path
      if (pathname === '/' || pathname === '') {
        try {
          const savedTab = localStorage.getItem('activeTab')
          if (savedTab && savedTab !== 'landing') {
            setActiveTab(savedTab)
          }
        } catch {}
      }
    }

    // Check for checkout status in URL
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const sessionId = params.get('session_id')
    
    if (checkout === 'success' && sessionId) {
      setCheckoutStatus('success')
      setActiveTab('settings')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      
      // Track purchase after successful checkout
      // Fetch profile to get tier and price info
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          try {
            const response = await fetch('/api/v1/user/profile', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            })
            if (response.ok) {
              const data = await response.json()
              const tier = data.profile?.tier
              const prices = { starter: 9, pro: 25 }
              const price = prices[tier] || 0
              if (tier && price > 0) {
                trackPurchase(price, 'USD', tier)
              }
            }
          } catch (err) {
            console.error('Error tracking purchase:', err)
          }
        }
      })
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => setCheckoutStatus(null), 10000)
    } else if (checkout === 'canceled') {
      setCheckoutStatus('canceled')
      setActiveTab('plans')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      
      // Auto-dismiss after 15 seconds (longer to give user time to read benefits)
      setTimeout(() => setCheckoutStatus(null), 15000)
    }
    
    // Check for existing session (do not force tab; preserve restored tab)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        hasInitialSessionRef.current = true
        loadUserData(session)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, 'Session exists:', !!session)
      setSession(session)
      
      // Only redirect to dashboard on an actual sign-in (not token refresh, not initial session)
      // But don't redirect if user is on a docs subroute (preserve their navigation)
      if (session && event === 'SIGNED_IN' && !hasInitialSessionRef.current) {
        const currentPath = window.location.pathname
        const isDocsSubroute = currentPath.startsWith('/docs/')
        
        // Don't redirect if user is on a docs subroute
        if (!isDocsSubroute) {
          setActiveTab('dashboard')
          // Reflect in URL
          try {
            window.history.pushState({}, '', '/dashboard')
          } catch {}
        }
        loadUserData(session)
      }
      
      // Mark that we've seen this session
      if (session) {
        hasInitialSessionRef.current = true
      }
    })

    // Sync tab when user navigates with back/forward
    const onPopState = () => {
      const tabFromPath = pathToTab(window.location.pathname)
      setActiveTab(tabFromPath)
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  // Persist active tab whenever it changes
  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('activeTab', activeTab)
        // Reflect active tab in the URL path
        const tabToPath = {
          landing: '/',
          wix: '/wix',
          'wix-docs': '/wix/docs',
          auth: '/auth',
          dashboard: '/dashboard',
          docs: '/docs',
          plans: '/plans',
          settings: '/settings',
          widget: '/widget',
        }
        const currentPath = tabToPath[activeTab] || '/'
        const currentPathname = window.location.pathname
        
        // Preserve query params and subroutes for docs tab
        const isDocsTab = activeTab === 'docs'
        const isDocsSubroute = currentPathname.startsWith('/docs/')
        
        // If we're on a docs subroute, always preserve it (don't change the URL)
        if (isDocsTab && isDocsSubroute) {
          // Don't modify the URL - preserve the subroute
          return
        }
        
        // Only update URL if it's different and we're not preserving a subroute
        const search = isDocsTab ? window.location.search : ''
        const target = `${currentPath}${search}`
        if (window.location.pathname + window.location.search !== target) {
          window.history.pushState({}, '', target)
        }
      }
    } catch {}
  }, [activeTab])

  // Track page views when activeTab changes
  useEffect(() => {
    if (activeTab) {
      const pageTitles = {
        landing: 'Landing Page',
        wix: 'PDF Generator for Wix',
        'wix-docs': 'Wix Setup Guide',
        dashboard: 'Dashboard',
        docs: 'Documentation',
        plans: 'Pricing Plans',
        settings: 'Settings',
        widget: 'Widget Configuration',
        auth: 'Authentication',
      }
      
      const title = pageTitles[activeTab] || 'Docuskribe'
      const path = window.location.pathname
      
      trackPageView(path, title)
    }
  }, [activeTab])

  const loadUserData = async (session, retryCount = 0) => {
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

      // Load API key and demo key
      const keyResponse = await fetch('/api/v1/user/api-key', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (keyResponse.ok) {
        const keyData = await keyResponse.json()
        if (keyData.api_key) {
          setApiKey(keyData.api_key.key)
        } else {
          setApiKey(null)
        }
        if (keyData.demo_key) {
          setDemoKey(keyData.demo_key.key)
        } else {
          setDemoKey(null)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      
      // Retry once after 2 seconds if this is after a checkout
      if (retryCount === 0 && checkoutStatus === 'success') {
        setTimeout(() => loadUserData(session, 1), 2000)
      }
    }
  }
  
  const refreshProfile = () => {
    if (session) {
      loadUserData(session)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setApiKey(null)
    setDemoKey(null)
    setActiveTab('dashboard')
  }

  const handleAccountDeleted = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setApiKey(null)
    setDemoKey(null)
    setActiveTab('dashboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Get SEO config based on active tab
  const getSEOConfig = () => {
    const path = activeTab === 'landing' ? '/' : `/${activeTab}`
    const url = `${BASE_URL}${path}`
    
    switch (activeTab) {
      case 'landing':
        return {
          title: 'Docuskribe - Generate PDFs and Screenshots from URLs',
          description: 'A simple, reliable PDF and screenshot generation API with fast rendering, queue-backed workers, and fair pricing. Generate beautiful PDFs from any URL in minutes.',
          keywords: 'PDF generation, screenshot API, URL to PDF, PDF converter, API, developer tools',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: false,
          nofollow: false,
        }
      case 'docs':
        return {
          title: 'Documentation - Docuskribe',
          description: 'Complete documentation for Docuskribe. Learn how to generate PDFs and screenshots from URLs with our API or embed widget.',
          keywords: 'Docuskribe API, PDF API documentation, screenshot API docs, API reference, PDF widget, embed',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: false,
          nofollow: false,
        }
      case 'plans':
        return {
          title: 'Pricing Plans - Docuskribe',
          description: 'Choose the perfect plan for your PDF generation needs. Free tier available. Upgrade anytime as you scale.',
          keywords: 'Docuskribe pricing, PDF API pricing, API plans, subscription plans',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: false,
          nofollow: false,
        }
      case 'auth':
        return {
          title: 'Sign In - Docuskribe',
          description: 'Sign in to your Docuskribe account to access your API key and manage your PDF generation jobs.',
          keywords: 'Docuskribe login, sign in, API key',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: true,
          nofollow: false,
        }
      case 'dashboard':
        return {
          title: 'Dashboard - Docuskribe',
          description: 'Manage your PDF generation jobs, view usage statistics, and access your API key.',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: true,
          nofollow: true,
        }
      case 'settings':
        return {
          title: 'Settings - Docuskribe',
          description: 'Manage your account settings, subscription, and API keys.',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: true,
          nofollow: true,
        }
      case 'widget':
        return {
          title: 'Widget Configuration - Docuskribe',
          description: 'Configure your PDF generation widget settings.',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: true,
          nofollow: true,
        }
      case 'wix':
        return {
          title: 'PDF Generator for Wix - Add PDF Generation to Your Wix Site',
          description: 'Install the PDF Generator app from Wix App Market. Let visitors convert pages to PDFs or take screenshots with one click. Free to install, easy to configure.',
          keywords: 'Wix app, PDF generator Wix, Wix PDF widget, screenshot Wix, Wix app market',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: false,
          nofollow: false,
        }
      case 'wix-docs':
        return {
          title: 'Wix Setup Guide - PDF Generator Installation & Configuration',
          description: 'Complete step-by-step guide to install and configure the PDF Generator widget on your Wix site. Get started in minutes.',
          keywords: 'Wix PDF generator setup, Wix widget configuration, Wix app installation guide',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: false,
          nofollow: false,
        }
      default:
        return {
          title: 'Docuskribe - Generate PDFs and Screenshots from URLs',
          description: 'A simple, reliable PDF and screenshot generation API.',
          canonical: url,
          ogImage: `${BASE_URL}/og-image.png`,
          noindex: false,
          nofollow: false,
        }
    }
  }

  // Get structured data based on active tab
  const getStructuredData = () => {
    switch (activeTab) {
      case 'landing':
        return [
          generateOrganizationSchema(BASE_URL),
          generateSoftwareApplicationSchema(BASE_URL),
          generateWebSiteSchema(BASE_URL),
        ]
      case 'docs':
        return [
          generateBreadcrumbSchema([
            { name: 'Home', url: BASE_URL },
            { name: 'Documentation', url: `${BASE_URL}/docs` },
          ]),
        ]
      case 'plans':
        return [
          generateBreadcrumbSchema([
            { name: 'Home', url: BASE_URL },
            { name: 'Pricing Plans', url: `${BASE_URL}/plans` },
          ]),
        ]
      case 'wix':
        return [
          generateBreadcrumbSchema([
            { name: 'Home', url: BASE_URL },
            { name: 'Wix App', url: `${BASE_URL}/wix` },
          ]),
        ]
      case 'wix-docs':
        return [
          generateBreadcrumbSchema([
            { name: 'Home', url: BASE_URL },
            { name: 'Wix App', url: `${BASE_URL}/wix` },
            { name: 'Setup Guide', url: `${BASE_URL}/wix/docs` },
          ]),
        ]
      default:
        return null
    }
  }

  const seoConfig = getSEOConfig()
  const structuredData = getStructuredData()

  // Show landing/docs pages for both logged in and logged out users
  // Content will be adjusted based on login status
  const isLoggedIn = !!session
  
  if (activeTab === 'wix') {
    return (
      <>
        <SEO {...seoConfig} />
        {structuredData && <StructuredData data={structuredData} />}
        <WixLandingView 
          isLoggedIn={isLoggedIn}
          profile={profile}
          onGetStarted={() => setActiveTab('auth')}
          onViewDocs={() => setActiveTab('wix-docs')}
          onGoToDashboard={() => setActiveTab('dashboard')}
        />
      </>
    )
  }
  
  if (activeTab === 'wix-docs') {
    return (
      <>
        <SEO {...seoConfig} />
        {structuredData && <StructuredData data={structuredData} />}
        <div className="min-h-screen bg-background">
          <div className="container max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
              <Button variant="ghost" onClick={() => setActiveTab('wix')}>← Back to Wix App</Button>
              {isLoggedIn && (
                <Button variant="outline" onClick={() => setActiveTab('dashboard')}>
                  Go to Dashboard
                </Button>
              )}
            </div>
            <WixDocsView 
              isLoggedIn={isLoggedIn}
              profile={profile}
              onGetStarted={() => setActiveTab('auth')}
              onGoToDashboard={() => setActiveTab('dashboard')}
            />
          </div>
        </div>
      </>
    )
  }
  
  if (activeTab === 'landing') {
    return (
      <>
        <SEO {...seoConfig} />
        {structuredData && <StructuredData data={structuredData} />}
        <LandingView 
          isLoggedIn={isLoggedIn}
          profile={profile}
          onGetStarted={() => setActiveTab('auth')}
          onViewDocs={() => setActiveTab('docs')}
          onViewPlans={() => isLoggedIn ? setActiveTab('plans') : setActiveTab('auth')}
          onViewWix={() => setActiveTab('wix')}
          onGoToDashboard={() => setActiveTab('dashboard')}
        />
      </>
    )
  }
  
  // Not logged in - show auth/docs pages
  if (!session) {
    return (
      <>
        <SEO {...seoConfig} />
        {structuredData && <StructuredData data={structuredData} />}
        <div className="min-h-screen bg-background">
          {activeTab === 'docs' ? (
            <div className="w-full px-4 py-8">
              <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" onClick={() => setActiveTab('landing')}>← Back to Home</Button>
              </div>
              <DocsView isLoggedIn={false} profile={null} onGetStarted={() => setActiveTab('auth')} onGoToWidget={() => setActiveTab('auth')} />
            </div>
          ) : (
            <div className="container max-w-4xl mx-auto px-4 py-8">
              <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" onClick={() => setActiveTab('landing')}>← Back to Home</Button>
              </div>
              <AuthView />
            </div>
          )}
        </div>
      </>
    )
  }

  // Logged in - show full dashboard with tabs
  return (
    <>
      <SEO {...seoConfig} />
      {structuredData && <StructuredData data={structuredData} />}
      <div className="min-h-screen bg-background">
      <div className={`${activeTab === 'docs' ? 'w-full' : 'container max-w-6xl mx-auto'} px-4 py-8`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Docuskribe API</h1>
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

        {/* Checkout Status Messages */}
        {checkoutStatus === 'success' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Payment successful!</strong> Your subscription is being activated. 
              It may take a few moments to reflect in your account. Please refresh the page if you don't see the update.
            </AlertDescription>
          </Alert>
        )}
        
        {checkoutStatus === 'canceled' && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <XCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <div className="space-y-3">
                <div>
                  <strong>Checkout Canceled</strong> – No worries! Your account is still active on the Free plan.
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-2">You're missing out on:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Up to 1,000 credits per month</li>
                    <li>No watermarks on PDFs</li>
                    <li>Higher rate limits & concurrent jobs</li>
                    <li>Priority support & faster processing</li>
                  </ul>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={() => setCheckoutStatus(null)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Try Again
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setCheckoutStatus(null)
                      setActiveTab('dashboard')
                    }}
                    className="border-amber-600 text-amber-700 hover:bg-amber-50"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
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
            <DocsView apiKey={demoKey || apiKey} isLoggedIn={true} profile={profile} onGetStarted={() => setActiveTab('widget')} onGoToWidget={() => setActiveTab('widget')} />
          </TabsContent>

          <TabsContent value="widget">
            <WidgetConfigView session={session} />
          </TabsContent>

          <TabsContent value="plans">
            <PlansView
              session={session}
              profile={profile}
              onSubscriptionFound={() => {
                refreshProfile()
                setActiveTab('settings')
              }}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsView 
              session={session} 
              profile={profile} 
              emailVerified={!!user?.email_confirmed_at}
              onAccountDeleted={handleAccountDeleted}
              onRefresh={refreshProfile}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  )
}

export default App

