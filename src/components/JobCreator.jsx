import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import JobResult from './JobResult'
import { supabase } from '../lib/supabase'

export default function JobCreator({ apiKey }) {
  const [url, setUrl] = useState('https://example.com')
  const [outputType, setOutputType] = useState('pdf')
  const [responseType, setResponseType] = useState('url')
  const [pdfFormat, setPdfFormat] = useState('A4')
  const [platform, setPlatform] = useState('')
  const [screenshotType, setScreenshotType] = useState('png')
  const [screenshotFullPage, setScreenshotFullPage] = useState('true')
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [jobResult, setJobResult] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleCreateJob = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    setJobResult(null)

    try {
      // Use API key passed as prop or fetch it
      let key = apiKey
      if (!key) {
        key = await getApiKey()
      }
      if (!key) {
        setError('Please wait for your API key to load')
        setLoading(false)
        return
      }

      const options = {
        outputType,
        responseType,
        platform: platform || undefined,
      }

      if (outputType === 'pdf') {
        options.pdfOptions = {
          format: pdfFormat,
        }
      } else {
        options.screenshotOptions = {
          type: screenshotType,
          fullPage: screenshotFullPage === 'true',
        }
      }

      const response = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
        },
        body: JSON.stringify({ url: url.trim(), options }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create job')
      }

      const data = await response.json()
      setJobId(data.jobId)
      setJobStatus('pending')
      setMessage('Job created! Waiting for completion...')

      // Start polling
      startPolling(data.jobId, key)
    } catch (err) {
      setError(err.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  const getApiKey = async () => {
    // Fetch API key from the API
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null

      const response = await fetch('/api/v1/user/api-key', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.api_key.key
    } catch (error) {
      console.error('Error getting API key:', error)
      return null
    }
  }

  const startPolling = (id, apiKey) => {
    let pollCount = 0
    const maxPolls = 60 // 60 seconds max

    const poll = async () => {
      pollCount++
      if (pollCount > maxPolls) {
        setError('Request timed out. Check job status manually.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/v1/jobs/${id}`, {
          headers: { 'x-api-key': apiKey },
        })

        if (!response.ok) throw new Error('Failed to get job status')

        const data = await response.json()
        setJobStatus(data.status)

        if (data.status === 'completed') {
          setJobResult(data.result)
          setMessage('Job completed successfully!')
          setLoading(false)
        } else if (data.status === 'failed') {
          setError(data.error || 'Job failed')
          setLoading(false)
        } else {
          // Continue polling
          setTimeout(poll, 2000)
        }
      } catch (err) {
        console.error('Polling error:', err)
        setTimeout(poll, 2000)
      }
    }

    poll()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate PDF or Screenshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jobUrl">Website URL</Label>
          <Input
            id="jobUrl"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="jobOutputType">Output Type</Label>
            <Select
              id="jobOutputType"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
              disabled={loading}
            >
              <option value="pdf">PDF</option>
              <option value="screenshot">Screenshot</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobResponseType">Response Type</Label>
            <Select
              id="jobResponseType"
              value={responseType}
              onChange={(e) => setResponseType(e.target.value)}
              disabled={loading}
            >
              <option value="url">Temporary URL</option>
              <option value="buffer">Buffer (base64)</option>
            </Select>
          </div>
        </div>

        {outputType === 'pdf' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobFormat">PDF Format</Label>
              <Select
                id="jobFormat"
                value={pdfFormat}
                onChange={(e) => setPdfFormat(e.target.value)}
                disabled={loading}
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobPlatform">Platform</Label>
              <Select
                id="jobPlatform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={loading}
              >
                <option value="">None</option>
                <option value="wix">Wix</option>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="screenshotType">Image Type</Label>
              <Select
                id="screenshotType"
                value={screenshotType}
                onChange={(e) => setScreenshotType(e.target.value)}
                disabled={loading}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="screenshotFullPage">Full Page</Label>
              <Select
                id="screenshotFullPage"
                value={screenshotFullPage}
                onChange={(e) => setScreenshotFullPage(e.target.value)}
                disabled={loading}
              >
                <option value="true">Yes</option>
                <option value="false">No (viewport only)</option>
              </Select>
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateJob}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating job...' : 'Create Job'}
        </Button>

        {jobId && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Job ID: <code className="bg-background px-1 py-0.5 rounded font-mono">{jobId}</code>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Status: <span className="font-medium">{jobStatus}</span>
            </p>
          </div>
        )}

        {jobResult && <JobResult result={jobResult} outputType={outputType} />}

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
  )
}

