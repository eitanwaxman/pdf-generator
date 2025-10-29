import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, Check, Play, ExternalLink } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/themes/prism.css'

// Interactive endpoint component
function EndpointSection({ 
  method, 
  path, 
  title, 
  description, 
  params = [], 
  bodyParams = [],
  response,
  apiKey,
  isLoggedIn 
}) {
  const [activeLanguage, setActiveLanguage] = useState('curl')
  const [copied, setCopied] = useState(false)
  const [codeFlash, setCodeFlash] = useState(false)
  const [trying, setTrying] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copiedJobId, setCopiedJobId] = useState(false)
  const codeRef = useRef(null)
  const resultCodeRef = useRef(null)
  const exampleCodeRef = useRef(null)
  
  // Dynamic parameter state
  const [paramValues, setParamValues] = useState(() => {
    const initial = {}
    params.forEach(p => initial[p.name] = p.default || '')
    bodyParams.forEach(p => initial[p.name] = p.default || '')
    return initial
  })
  
  // Get current output type to show/hide options
  const currentOutputType = paramValues['options.outputType'] || 'pdf'
  
  const updateParam = (name, value) => {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }
  
  // Highlight code when language or parameters change
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
    if (resultCodeRef.current) {
      Prism.highlightElement(resultCodeRef.current)
    }
    if (exampleCodeRef.current) {
      Prism.highlightElement(exampleCodeRef.current)
    }
  }, [activeLanguage, paramValues, result])
  
  // Generate code examples with current parameters
  const generateCode = (lang) => {
    const baseUrl = window.location.origin
    let finalPath = path
    const queryParams = params.filter(p => p.in === 'query' && paramValues[p.name])
    const pathParams = params.filter(p => p.in === 'path')
    
    // Replace path params
    pathParams.forEach(p => {
      finalPath = finalPath.replace(`:${p.name}`, paramValues[p.name] || `{${p.name}}`)
    })
    
    // Add query params
    if (queryParams.length > 0) {
      const queryString = queryParams.map(p => `${p.name}=${paramValues[p.name]}`).join('&')
      finalPath += `?${queryString}`
    }
    
    const fullUrl = `${baseUrl}${finalPath}`
    const key = apiKey || 'YOUR_API_KEY'
    
    // Build request body
    const hasBody = bodyParams.length > 0
    const bodyObj = {}
    bodyParams.forEach(p => {
      // Only include options that match the current outputType
      if (p.name.includes('pdfOptions') && currentOutputType !== 'pdf') return
      if (p.name.includes('screenshotOptions') && currentOutputType !== 'screenshot') return
      
      if (paramValues[p.name] !== undefined && paramValues[p.name] !== '') {
        // Handle nested objects
        let value = paramValues[p.name]
        
        // Convert numeric values to numbers
        if (p.type === 'number') {
          value = Number(value)
          if (isNaN(value)) return // Skip invalid numbers
        }
        
        // Convert boolean values
        if (p.type === 'boolean') {
          value = value === true || value === 'true'
        }
        
        if (p.name.includes('.')) {
          const parts = p.name.split('.')
          let current = bodyObj
          
          // Build nested structure
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {}
            }
            current = current[parts[i]]
          }
          
          // Set the final value
          current[parts[parts.length - 1]] = value
        } else {
          bodyObj[p.name] = value
        }
      }
    })
    
    // Clean up empty nested objects
    if (bodyObj.options) {
      if (bodyObj.options.pdfOptions) {
        if (bodyObj.options.pdfOptions.margin && Object.keys(bodyObj.options.pdfOptions.margin).length === 0) {
          delete bodyObj.options.pdfOptions.margin
        }
        if (bodyObj.options.pdfOptions.viewport && Object.keys(bodyObj.options.pdfOptions.viewport).length === 0) {
          delete bodyObj.options.pdfOptions.viewport
        }
        if (Object.keys(bodyObj.options.pdfOptions).length === 0) {
          delete bodyObj.options.pdfOptions
        }
      }
      if (bodyObj.options.screenshotOptions) {
        if (bodyObj.options.screenshotOptions.viewport && Object.keys(bodyObj.options.screenshotOptions.viewport).length === 0) {
          delete bodyObj.options.screenshotOptions.viewport
        }
        if (Object.keys(bodyObj.options.screenshotOptions).length === 0) {
          delete bodyObj.options.screenshotOptions
        }
      }
    }
    
    const bodyJson = JSON.stringify(bodyObj, null, 2)
    
    if (lang === 'curl') {
      let cmd = `curl -X ${method} ${fullUrl} \\\n  -H "x-api-key: ${key}"`
      if (hasBody) {
        cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyJson.replace(/\n/g, '\n  ')}'`
      }
      return cmd
    }
    
    if (lang === 'node') {
      return `const axios = require('axios');

const response = await axios${method === 'GET' ? '.get' : ''}${method === 'POST' ? '.post' : ''}${method === 'DELETE' ? '.delete' : ''}${method === 'PATCH' ? '.patch' : ''}('${fullUrl}'${hasBody ? `,\n  ${bodyJson}` : ''}, {
  headers: {
    'x-api-key': '${key}'${hasBody ? `,\n    'Content-Type': 'application/json'` : ''}
  }
});

console.log(response.data);`
    }
    
    if (lang === 'python') {
      return `import requests

response = requests.${method.toLowerCase()}(
    '${fullUrl}',
    headers={'x-api-key': '${key}'}${hasBody ? `,\n    json=${bodyJson}` : ''}
)

print(response.json())`
    }
    
    if (lang === 'javascript') {
      return `const response = await fetch('${fullUrl}', {
  method: '${method}',
  headers: {
    'x-api-key': '${key}'${hasBody ? `,\n    'Content-Type': 'application/json'` : ''}
  }${hasBody ? `,\n  body: JSON.stringify(${bodyJson})` : ''}
});

const data = await response.json();
console.log(data);`
    }
  }
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCode(activeLanguage))
      setCopied(true)
      setCodeFlash(true)
      setTimeout(() => {
        setCopied(false)
        setCodeFlash(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  const handleCopyJobId = async () => {
    if (result?.jobId) {
      try {
        await navigator.clipboard.writeText(result.jobId)
        setCopiedJobId(true)
        setTimeout(() => setCopiedJobId(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }
  
  const handleViewPdf = () => {
    if (result?.result?.url) {
      window.open(result.result.url, '_blank')
    }
  }
  
  const handleTryIt = async () => {
    if (!apiKey && isLoggedIn === false) {
      setError('Please provide an API key')
      return
    }
    
    setTrying(true)
    setError('')
    setResult(null)
    
    try {
      let finalPath = path
      const pathParams = params.filter(p => p.in === 'path')
      pathParams.forEach(p => {
        finalPath = finalPath.replace(`:${p.name}`, paramValues[p.name])
      })
      
      const bodyObj = {}
      bodyParams.forEach(p => {
        // Only include options that match the current outputType
        if (p.name.includes('pdfOptions') && currentOutputType !== 'pdf') return
        if (p.name.includes('screenshotOptions') && currentOutputType !== 'screenshot') return
        
        if (paramValues[p.name] !== undefined && paramValues[p.name] !== '') {
          let value = paramValues[p.name]
          
          // Convert numeric values to numbers
          if (p.type === 'number') {
            value = Number(value)
            if (isNaN(value)) return // Skip invalid numbers
          }
          
          // Convert boolean values
          if (p.type === 'boolean') {
            value = value === true || value === 'true'
          }
          
          if (p.name.includes('.')) {
            const parts = p.name.split('.')
            let current = bodyObj
            
            // Build nested structure
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) {
                current[parts[i]] = {}
              }
              current = current[parts[i]]
            }
            
            // Set the final value
            current[parts[parts.length - 1]] = value
          } else {
            bodyObj[p.name] = value
          }
        }
      })
      
      // Clean up empty nested objects
      if (bodyObj.options) {
        if (bodyObj.options.pdfOptions) {
          if (bodyObj.options.pdfOptions.margin && Object.keys(bodyObj.options.pdfOptions.margin).length === 0) {
            delete bodyObj.options.pdfOptions.margin
          }
          if (bodyObj.options.pdfOptions.viewport && Object.keys(bodyObj.options.pdfOptions.viewport).length === 0) {
            delete bodyObj.options.pdfOptions.viewport
          }
          if (Object.keys(bodyObj.options.pdfOptions).length === 0) {
            delete bodyObj.options.pdfOptions
          }
        }
        if (bodyObj.options.screenshotOptions) {
          if (bodyObj.options.screenshotOptions.viewport && Object.keys(bodyObj.options.screenshotOptions.viewport).length === 0) {
            delete bodyObj.options.screenshotOptions.viewport
          }
          if (Object.keys(bodyObj.options.screenshotOptions).length === 0) {
            delete bodyObj.options.screenshotOptions
          }
        }
      }
      
      const options = {
        method,
        headers: {
          'x-api-key': apiKey || paramValues.apiKey || 'YOUR_API_KEY'
        }
      }
      
      if (bodyParams.length > 0) {
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(bodyObj)
      }
      
      const res = await fetch(finalPath, options)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Request failed')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setTrying(false)
    }
  }
  
  const methodColors = {
    GET: 'bg-blue-500',
    POST: 'bg-green-600',
    DELETE: 'bg-red-500',
    PATCH: 'bg-yellow-600'
  }
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`${methodColors[method]} text-white px-3 py-1 rounded text-sm font-bold`}>
                  {method}
                </span>
                <code className="text-lg font-mono">{path}</code>
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{description}</p>
            </div>
            <Button onClick={handleTryIt} disabled={trying} size="sm" className="ml-4">
              <Play className="h-4 w-4 mr-2" />
              {trying ? 'Testing...' : 'Try It'}
            </Button>
          </div>
          
          {/* Parameters */}
          {(params.length > 0 || bodyParams.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Parameters</h4>
                
                {!isLoggedIn && !apiKey && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      value={paramValues.apiKey || ''}
                      onChange={(e) => updateParam('apiKey', e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                )}
                
                {params.map(param => (
                  <div key={param.name} className="space-y-2">
                    <Label htmlFor={param.name}>
                      {param.name}
                      {param.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {param.type === 'select' ? (
                      <Select
                        id={param.name}
                        value={paramValues[param.name]}
                        onChange={(e) => updateParam(param.name, e.target.value)}
                      >
                        {param.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Select>
                      ) : (
                        <Input
                          id={param.name}
                          value={paramValues[param.name] || ''}
                          onChange={(e) => updateParam(param.name, e.target.value)}
                          placeholder={param.placeholder || param.name}
                          type={param.type === 'number' ? 'number' : 'text'}
                        />
                      )}
                      {param.description && (
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                          {param.type && param.type !== 'select' && param.type !== 'boolean' && (
                            <span className="ml-1 text-xs font-mono text-muted-foreground/70">
                              ({param.type})
                            </span>
                          )}
                        </p>
                      )}
                  </div>
                ))}
                
                {bodyParams.map(param => {
                  // Show/hide based on outputType
                  if (param.name.includes('pdfOptions') && currentOutputType !== 'pdf') return null
                  if (param.name.includes('screenshotOptions') && currentOutputType !== 'screenshot') return null
                  
                  return (
                    <div key={param.name} className="space-y-2">
                      <Label htmlFor={param.name}>
                        {param.name}
                        {param.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {param.type === 'select' ? (
                        <Select
                          id={param.name}
                          value={paramValues[param.name]}
                          onChange={(e) => updateParam(param.name, e.target.value)}
                        >
                          {param.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </Select>
                      ) : param.type === 'boolean' ? (
                        <Select
                          id={param.name}
                          value={paramValues[param.name]}
                          onChange={(e) => updateParam(param.name, e.target.value === 'true')}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </Select>
                      ) : (
                        <Input
                          id={param.name}
                          value={paramValues[param.name]}
                          onChange={(e) => updateParam(param.name, e.target.value)}
                          placeholder={param.placeholder || param.name}
                          type={param.type === 'number' ? 'number' : 'text'}
                        />
                      )}
                      {param.description && (
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                          {param.type && param.type !== 'select' && param.type !== 'boolean' && (
                            <span className="ml-1 text-xs font-mono text-muted-foreground/70">
                              ({param.type})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Code Example */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Code Example</h4>
                  <div className="flex gap-2">
                    {['curl', 'node', 'python', 'javascript'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setActiveLanguage(lang)}
                        className={`text-xs px-2 py-1 rounded ${
                          activeLanguage === lang 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <pre className={`bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-80 transition-all ${
                    codeFlash ? 'flash-code' : ''
                  }`}>
                    <code 
                      ref={codeRef}
                      className={`language-${activeLanguage === 'curl' ? 'bash' : activeLanguage === 'node' ? 'javascript' : activeLanguage}`}
                    >
                      {generateCode(activeLanguage)}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          {/* Response */}
          {result && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Response</h4>
                <div className="flex gap-2">
                  {result.jobId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyJobId}
                    >
                      {copiedJobId ? (
                        <>
                          <Check className="h-3 w-3 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Job ID
                        </>
                      )}
                    </Button>
                  )}
                  {result.result?.url && (result.result.url.includes('.pdf') || result.result.url.includes('.png') || result.result.url.includes('.jpeg') || result.result.url.includes('.webp')) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewPdf}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View {result.result.url.includes('.pdf') ? 'PDF' : 'Image'}
                    </Button>
                  )}
                </div>
              </div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-80">
                <code ref={resultCodeRef} className="language-json">{JSON.stringify(result, null, 2)}</code>
              </pre>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Example Response */}
          {response && !result && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-sm mb-2">Example Response</h4>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                <code ref={exampleCodeRef} className="language-json">{JSON.stringify(response, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DocsView({ apiKey, isLoggedIn }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary to-purple-600 text-primary-foreground">
        <CardContent className="py-12 text-center">
          <h1 className="text-4xl font-bold mb-2">PDF Generator API</h1>
          <p className="text-lg text-primary-foreground/90">
            Convert any website to PDF or screenshot with a simple API call
          </p>
          <p className="text-sm mt-4 text-primary-foreground/80">
            Base URL: <code className="bg-black/20 px-2 py-1 rounded">{window.location.origin}/api/v1</code>
          </p>
        </CardContent>
      </Card>
      
      {/* Authentication */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-3">Authentication</h2>
          <p className="text-muted-foreground mb-4">
            All API requests require an API key. Include your API key in the <code className="bg-muted px-2 py-1 rounded">x-api-key</code> header.
          </p>
          {isLoggedIn && apiKey ? (
            <Alert>
              <AlertDescription>
                ✅ Your API key is automatically populated in the examples below
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                Sign in to automatically populate your API key in examples, or enter it manually when testing endpoints
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <h2 className="text-2xl font-bold mt-8">Jobs</h2>
      
      {/* POST /api/v1/jobs */}
      <EndpointSection
        method="POST"
        path="/api/v1/jobs"
        title="Create a PDF or Screenshot Job"
        description="Submit a URL to generate a PDF or take a screenshot. Returns a job ID for status polling."
        bodyParams={[
          { name: 'url', required: true, type: 'string', default: 'https://example.com', placeholder: 'https://example.com', description: 'Website URL to convert (string, required)' },
          { name: 'options.outputType', type: 'select', options: ['pdf', 'screenshot'], default: 'pdf', description: 'Output type (string: "pdf" | "screenshot")' },
          { name: 'options.responseType', type: 'select', options: ['url', 'buffer'], default: 'url', description: 'Response format (string: "url" | "buffer")' },
          { name: 'options.platform', type: 'select', options: ['', 'wix'], default: '', description: 'Platform optimization (string: "" | "wix", optional)' },
          // PDF Options
          { name: 'options.pdfOptions.format', type: 'select', options: ['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'], default: 'A4', description: 'PDF page format (string: "Letter" | "Legal" | "Tabloid" | "Ledger" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6")' },
          { name: 'options.pdfOptions.margin.top', type: 'string', default: '50px', description: 'Top margin (string, CSS length: "50px" | "2cm" | "1in", optional)' },
          { name: 'options.pdfOptions.margin.right', type: 'string', default: '50px', description: 'Right margin (string, CSS length: "50px" | "2cm" | "1in", optional)' },
          { name: 'options.pdfOptions.margin.bottom', type: 'string', default: '50px', description: 'Bottom margin (string, CSS length: "50px" | "2cm" | "1in", optional)' },
          { name: 'options.pdfOptions.margin.left', type: 'string', default: '50px', description: 'Left margin (string, CSS length: "50px" | "2cm" | "1in", optional)' },
          { name: 'options.pdfOptions.viewport.width', type: 'number', default: '1920', description: 'Viewport width in pixels (number, > 0, optional)' },
          { name: 'options.pdfOptions.viewport.height', type: 'number', default: '1080', description: 'Viewport height in pixels (number, > 0, optional)' },
          // Screenshot Options
          { name: 'options.screenshotOptions.type', type: 'select', options: ['png', 'jpeg', 'webp'], default: 'png', description: 'Image format (string: "png" | "jpeg" | "webp")' },
          { name: 'options.screenshotOptions.quality', type: 'number', default: '90', description: 'Image quality (number, 0-100, JPEG only, optional)' },
          { name: 'options.screenshotOptions.fullPage', type: 'boolean', default: 'true', description: 'Capture full page (boolean: true | false)' },
          { name: 'options.screenshotOptions.viewport.width', type: 'number', default: '1920', description: 'Viewport width in pixels (number, > 0, optional)' },
          { name: 'options.screenshotOptions.viewport.height', type: 'number', default: '1080', description: 'Viewport height in pixels (number, > 0, optional)' },
        ]}
        response={{
          jobId: 'uuid-here',
          status: 'pending',
          outputType: 'pdf',
          message: 'Job created successfully',
          credits: {
            used: 1,
            remaining: 99,
            monthly_limit: 100
          }
        }}
        apiKey={apiKey}
        isLoggedIn={isLoggedIn}
      />
      
      {/* GET /api/v1/jobs/:jobId */}
      <EndpointSection
        method="GET"
        path="/api/v1/jobs/:jobId"
        title="Get Job Status"
        description="Check the status of a job and retrieve the result when complete."
        params={[
          { name: 'jobId', in: 'path', required: true, type: 'string', placeholder: 'job-uuid', description: 'The job ID returned from create job (string, UUID, required)' }
        ]}
        response={{
          status: 'completed',
          result: {
            type: 'url',
            url: 'https://your-domain.com/temp/uuid.pdf'
          },
          progress: 100,
          finishedOn: 1234567890
        }}
        apiKey={apiKey}
        isLoggedIn={isLoggedIn}
      />
      
      {/* DELETE /api/v1/jobs/:jobId */}
      <EndpointSection
        method="DELETE"
        path="/api/v1/jobs/:jobId"
        title="Cancel Job"
        description="Cancel a pending job before it's processed."
        params={[
          { name: 'jobId', in: 'path', required: true, type: 'string', placeholder: 'job-uuid', description: 'The job ID to cancel (string, UUID, required)' }
        ]}
        response={{
          message: 'Job cancelled successfully'
        }}
        apiKey={apiKey}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
