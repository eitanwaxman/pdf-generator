import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, Check, Play, ExternalLink, Code, Package, Wrench } from 'lucide-react'
import WixDocsView from './WixDocsView'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/themes/prism.css'
import EmbedDocsView from './EmbedDocsView'

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

  // Initialize params from URL query string on mount
  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search)
      setParamValues(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(key => {
          if (search.has(key)) {
            const raw = search.get(key)
            next[key] = raw
          }
        })
        return next
      })
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Get current output type to show/hide options
  const currentOutputType = paramValues['options.outputType'] || 'pdf'
  
  const updateParam = (name, value) => {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }

  // Reflect parameters in the URL so the page is shareable
  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search)
      Object.entries(paramValues).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === null) {
          search.delete(key)
        } else {
          search.set(key, String(value))
        }
      })
      const newSearch = search.toString()
      const target = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`
      if (window.location.pathname + window.location.search !== target) {
        window.history.replaceState({}, '', target)
      }
    } catch {}
  }, [paramValues])
  
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
    <Card className="mb-6 border-2 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className={`${methodColors[method]} text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm`}>
                  {method}
                </span>
                <code className="text-base font-mono text-foreground break-all">{path}</code>
              </div>
              <h3 className="text-2xl font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
            <Button onClick={handleTryIt} disabled={trying} size="sm" className="ml-4 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow">
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

// API Documentation Component
function ApiDocs({ apiKey, isLoggedIn }) {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Docuskribe API
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Convert any website to PDF or screenshot with a simple API call
          </p>
        </div>
        <Card className="bg-gradient-to-r from-primary to-purple-600 text-primary-foreground border-0 shadow-lg">
          <CardContent className="py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-primary-foreground/90 mb-2 font-medium">Base URL</p>
                <code className="bg-black/20 px-3 py-1.5 rounded-md text-sm font-mono">{window.location.origin}/api/v1</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Authentication */}
      <Card className="border-2 shadow-sm">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-3">Authentication</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            All API requests require an API key. Include your API key in the <code className="bg-muted px-2 py-1 rounded text-sm font-mono">x-api-key</code> header.
          </p>
          {isLoggedIn && apiKey ? (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200">
                ✅ Your demo API key is automatically populated in the examples below. Use your live API key in the dashboard for production.
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
      
      <div className="pt-4">
        <h2 className="text-3xl font-bold mb-6">Endpoints</h2>
      </div>
      
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
          { name: 'options.formFactor', type: 'select', options: ['desktop', 'mobile'], default: 'desktop', description: 'Device form factor (string: "desktop" | "mobile", default: "desktop")' },
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

      {/* Wix App Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Using Wix?</h2>
              <p className="text-muted-foreground mb-4">
                Install our Wix app to add PDF generation directly to your Wix site. 
                No API integration needed - just install and configure in the Wix Editor.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => window.location.href = '/wix'}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Wix App
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://wix.to/MMv9cAJ', '_blank')}
                >
                  Install from Wix App Market
                </Button>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2">
                Wix App Market
              </div>
              <p className="text-sm text-muted-foreground">Free to install</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Widget Documentation Component (wrapper for EmbedDocsView)
function WidgetDocs({ isLoggedIn, profile, onGetStarted, onGoToDashboard }) {
  return <EmbedDocsView isLoggedIn={isLoggedIn} profile={profile} onGetStarted={onGetStarted} onGoToDashboard={onGoToDashboard} />
}

// Wix Documentation Component
function WixDocsSection({ isLoggedIn, profile, onGetStarted, onGoToDashboard }) {
  return <WixDocsView isLoggedIn={isLoggedIn} profile={profile} onGetStarted={onGetStarted} onGoToDashboard={onGoToDashboard} />
}

export default function DocsView({ apiKey, isLoggedIn, profile, onGetStarted, onGoToWidget }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const navItems = [
    { id: 'api', label: 'API Reference', icon: Code, path: '/docs/api' },
    { id: 'widget', label: 'Widget / Embed', icon: Package, path: '/docs/widget' },
    { id: 'wix', label: 'Wix App', icon: Wrench, path: '/docs/wix' },
  ]

  // Get active section from URL path
  const getActiveSectionFromPath = () => {
    if (typeof window === 'undefined') return 'api'
    const pathname = window.location.pathname
    if (pathname.startsWith('/docs/wix')) return 'wix'
    if (pathname.startsWith('/docs/widget')) return 'widget'
    if (pathname.startsWith('/docs/api')) return 'api'
    if (pathname === '/docs') {
      // Redirect /docs to /docs/api only if we're not already on a subroute
      // This prevents redirect loops
      const search = window.location.search
      window.history.replaceState({}, '', '/docs/api' + search)
      return 'api'
    }
    if (pathname.startsWith('/docs')) return 'api' // default to api for other /docs paths
    return 'api'
  }

  const [activeSection, setActiveSection] = useState(() => getActiveSectionFromPath())

  // Sync activeSection with URL path on mount and when pathname changes
  useEffect(() => {
    const handlePopState = () => {
      const sectionFromPath = getActiveSectionFromPath()
      if (sectionFromPath !== activeSection) {
        setActiveSection(sectionFromPath)
      }
    }
    
    // Check on mount and redirect /docs to /docs/api if needed
    const sectionFromPath = getActiveSectionFromPath()
    if (sectionFromPath !== activeSection) {
      setActiveSection(sectionFromPath)
    }
    
    // Listen for browser back/forward
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Update URL when section changes
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId)
    const navItem = navItems.find(item => item.id === sectionId)
    if (navItem) {
      const newPath = navItem.path
      const search = window.location.search // Preserve query params
      const target = `${newPath}${search}`
      if (window.location.pathname + window.location.search !== target) {
        window.history.pushState({}, '', target)
      }
    }
  }
  
  return (
    <div className="w-full min-h-screen">
      <div className="flex gap-6 w-full">
        {/* Side Navigation - Desktop only */}
        <aside className={`hidden md:block transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-56' : 'w-0'} flex-shrink-0 overflow-hidden border-r border-border/40`}>
          <div className="sticky top-8 pr-4">
            {sidebarOpen && (
              <>
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    <span className="text-xs">Navigation</span>
                  </Button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeSection === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSectionChange(item.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-3 group ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </>
            )}
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile Navigation */}
          <div className="md:hidden mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sidebar Toggle Button - Desktop (when sidebar is closed) */}
          {!sidebarOpen && (
            <div className="hidden md:flex items-center gap-2 mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-9 w-9"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Content Container with max-width for readability */}
          <div className="max-w-5xl mx-auto">
            {activeSection === 'api' ? (
              <ApiDocs apiKey={apiKey} isLoggedIn={isLoggedIn} />
            ) : activeSection === 'widget' ? (
              <WidgetDocs isLoggedIn={isLoggedIn} profile={profile} onGetStarted={onGetStarted} onGoToDashboard={onGoToWidget || (() => window.location.href = '/widget')} />
            ) : (
              <WixDocsSection isLoggedIn={isLoggedIn} profile={profile} onGetStarted={onGetStarted} onGoToDashboard={onGoToWidget || (() => window.location.href = '/widget')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
