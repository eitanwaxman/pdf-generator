import { Alert, AlertDescription } from './ui/alert'
import UsageCard from './UsageCard'
import ApiKeyCard from './ApiKeyCard'
import { AlertCircle } from 'lucide-react'

export default function DashboardView({ session, profile, apiKey, user }) {
  return (
    <div className="space-y-6">
      {/* Email Verification Warning */}
      {user && !user.email_confirmed_at && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Please verify your email</strong>
            <br />
            Check your inbox for a verification email. You'll need to verify your email before you can access your API key.
          </AlertDescription>
        </Alert>
      )}

      {/* API Key Card */}
      <ApiKeyCard session={session} emailVerified={!!user?.email_confirmed_at} />

      {/* Usage Card */}
      {profile && <UsageCard profile={profile} />}
    </div>
  )
}

