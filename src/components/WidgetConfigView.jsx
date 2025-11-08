import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Copy, Plus, Trash2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function WidgetConfigView({ session }) {
  const [publicKeys, setPublicKeys] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')
  
  // Public key creation state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDomains, setNewKeyDomains] = useState([''])
  const [creating, setCreating] = useState(false)
  
  // Widget configuration state
  const [widgetConfig, setWidgetConfig] = useState({
    urlSource: 'current',
    customUrl: '',
    outputType: 'pdf',
    pdfFormat: 'A4',
    pdfMarginTop: '50px',
    pdfMarginRight: '50px',
    pdfMarginBottom: '50px',
    pdfMarginLeft: '50px',
    formFactor: 'desktop',
    screenshotType: 'png',
    screenshotQuality: 90,
    screenshotFullPage: true,
    buttonText: 'Generate PDF'
  })
  
  // Domain editing state
  const [editingDomains, setEditingDomains] = useState(null)
  const [tempDomains, setTempDomains] = useState([])
  const [showKeys, setShowKeys] = useState({})

  useEffect(() => {
    loadPublicKeys()
  }, [session])

  const loadPublicKeys = async () => {
    try {
      const response = await fetch('/api/v1/public-keys', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load public keys')
      }

      const data = await response.json()
      setPublicKeys(data.public_keys || [])
      
      // Auto-select first key if available
      if (data.public_keys && data.public_keys.length > 0 && !selectedKey) {
        setSelectedKey(data.public_keys[0])
      }
    } catch (error) {
      console.error('Error loading public keys:', error)
      showMessage('Failed to load public keys', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg, type = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      showMessage('Please enter a name for the key', 'error')
      return
    }

    // Filter out empty domains
    const domains = newKeyDomains.filter(d => d.trim())
    
    if (domains.length === 0) {
      showMessage('Please add at least one authorized domain', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/v1/public-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newKeyName,
          authorized_domains: domains
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create public key')
      }

      const data = await response.json()
      setPublicKeys([data.public_key, ...publicKeys])
      setSelectedKey(data.public_key)
      setShowCreateForm(false)
      setNewKeyName('')
      setNewKeyDomains([''])
      showMessage('Public key created successfully!', 'success')
    } catch (error) {
      console.error('Error creating public key:', error)
      showMessage('Failed to create public key', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this public key? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/public-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete public key')
      }

      setPublicKeys(publicKeys.filter(k => k.id !== keyId))
      if (selectedKey?.id === keyId) {
        setSelectedKey(publicKeys.find(k => k.id !== keyId) || null)
      }
      showMessage('Public key deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting public key:', error)
      showMessage('Failed to delete public key', 'error')
    }
  }

  const startEditingDomains = (key) => {
    setEditingDomains(key.id)
    setTempDomains([...key.authorized_domains])
  }

  const saveEditedDomains = async (keyId) => {
    const domains = tempDomains.filter(d => d.trim())
    
    if (domains.length === 0) {
      showMessage('Please add at least one authorized domain', 'error')
      return
    }

    try {
      const response = await fetch(`/api/v1/public-keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authorized_domains: domains
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update domains')
      }

      const data = await response.json()
      setPublicKeys(publicKeys.map(k => k.id === keyId ? data.public_key : k))
      if (selectedKey?.id === keyId) {
        setSelectedKey(data.public_key)
      }
      setEditingDomains(null)
      showMessage('Domains updated successfully', 'success')
    } catch (error) {
      console.error('Error updating domains:', error)
      showMessage('Failed to update domains', 'error')
    }
  }

  const copyToClipboard = (text, label = 'Text') => {
    navigator.clipboard.writeText(text)
    showMessage(`${label} copied to clipboard!`, 'success')
  }

  const generateEmbedCode = () => {
    if (!selectedKey) return ''
    
    const attrs = [
      `public-key="${selectedKey.key}"`,
      `url-source="${widgetConfig.urlSource}"`,
    ]
    
    if (widgetConfig.urlSource === 'custom' && widgetConfig.customUrl) {
      attrs.push(`custom-url="${widgetConfig.customUrl}"`)
    }
    
    attrs.push(`output-type="${widgetConfig.outputType}"`)
    attrs.push(`form-factor="${widgetConfig.formFactor}"`)
    
    if (widgetConfig.outputType === 'pdf') {
      attrs.push(`pdf-format="${widgetConfig.pdfFormat}"`)
      attrs.push(`pdf-margin-top="${widgetConfig.pdfMarginTop}"`)
      attrs.push(`pdf-margin-right="${widgetConfig.pdfMarginRight}"`)
      attrs.push(`pdf-margin-bottom="${widgetConfig.pdfMarginBottom}"`)
      attrs.push(`pdf-margin-left="${widgetConfig.pdfMarginLeft}"`)
    } else {
      attrs.push(`screenshot-type="${widgetConfig.screenshotType}"`)
      attrs.push(`screenshot-quality="${widgetConfig.screenshotQuality}"`)
      attrs.push(`screenshot-full-page="${widgetConfig.screenshotFullPage}"`)
    }
    
    if (widgetConfig.buttonText) {
      attrs.push(`button-text="${widgetConfig.buttonText}"`)
    }
    
    const apiUrl = window.location.origin
    
    return `<!-- Docuskribe Widget -->
<script src="${apiUrl}/cdn/widget/bundle.js"></script>
<docuskribe-widget
  ${attrs.join('\n  ')}
></docuskribe-widget>`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'bg-green-50 border-green-200' : ''}>
          {messageType === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription className={messageType === 'success' ? 'text-green-800' : ''}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Public Keys Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Public API Keys</CardTitle>
              <CardDescription>
                Create public keys restricted to specific domains for use in embedded widgets
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Form */}
          {showCreateForm && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Create New Public Key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., My Website Widget"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Authorized Domains</Label>
                  <div className="space-y-2">
                    {newKeyDomains.map((domain, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="example.com or *.example.com"
                          value={domain}
                          onChange={(e) => {
                            const updated = [...newKeyDomains]
                            updated[index] = e.target.value
                            setNewKeyDomains(updated)
                          }}
                        />
                        {newKeyDomains.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewKeyDomains(newKeyDomains.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewKeyDomains([...newKeyDomains, ''])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Domain
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use <code>*.example.com</code> for all subdomains or <code>localhost:*</code> for development
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCreateKey} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public Keys List */}
          {publicKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No public keys yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {publicKeys.map((key) => (
                <Card key={key.id} className={selectedKey?.id === key.id ? 'border-2 border-primary' : ''}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{key.name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {showKeys[key.id] ? key.key : key.key.substring(0, 20) + '...'}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowKeys({...showKeys, [key.id]: !showKeys[key.id]})}
                            >
                              {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.key, 'Public key')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={selectedKey?.id === key.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedKey(key)}
                          >
                            {selectedKey?.id === key.id ? 'Selected' : 'Select'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-sm">Authorized Domains</Label>
                          {editingDomains === key.id ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveEditedDomains(key.id)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingDomains(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingDomains(key)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        
                        {editingDomains === key.id ? (
                          <div className="space-y-2">
                            {tempDomains.map((domain, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={domain}
                                  onChange={(e) => {
                                    const updated = [...tempDomains]
                                    updated[index] = e.target.value
                                    setTempDomains(updated)
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTempDomains(tempDomains.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTempDomains([...tempDomains, ''])}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Domain
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {key.authorized_domains.map((domain, index) => (
                              <span key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                                {domain}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget Configuration */}
      {selectedKey && (
        <Card>
          <CardHeader>
            <CardTitle>Widget Configuration</CardTitle>
            <CardDescription>
              Customize the widget appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urlSource">URL Source</Label>
                <select
                  id="urlSource"
                  className="w-full border rounded px-3 py-2"
                  value={widgetConfig.urlSource}
                  onChange={(e) => setWidgetConfig({...widgetConfig, urlSource: e.target.value})}
                >
                  <option value="current">Current Page</option>
                  <option value="custom">Custom URL</option>
                </select>
              </div>
              
              {widgetConfig.urlSource === 'custom' && (
                <div>
                  <Label htmlFor="customUrl">Custom URL</Label>
                  <Input
                    id="customUrl"
                    placeholder="https://example.com"
                    value={widgetConfig.customUrl}
                    onChange={(e) => setWidgetConfig({...widgetConfig, customUrl: e.target.value})}
                  />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="outputType">Output Type</Label>
                <select
                  id="outputType"
                  className="w-full border rounded px-3 py-2"
                  value={widgetConfig.outputType}
                  onChange={(e) => setWidgetConfig({...widgetConfig, outputType: e.target.value})}
                >
                  <option value="pdf">PDF</option>
                  <option value="screenshot">Screenshot</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="formFactor">Form Factor</Label>
                <select
                  id="formFactor"
                  className="w-full border rounded px-3 py-2"
                  value={widgetConfig.formFactor}
                  onChange={(e) => setWidgetConfig({...widgetConfig, formFactor: e.target.value})}
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
            
            {widgetConfig.outputType === 'pdf' && (
              <>
                <div>
                  <Label htmlFor="pdfFormat">PDF Format</Label>
                  <select
                    id="pdfFormat"
                    className="w-full border rounded px-3 py-2"
                    value={widgetConfig.pdfFormat}
                    onChange={(e) => setWidgetConfig({...widgetConfig, pdfFormat: e.target.value})}
                  >
                    {['A4', 'Letter', 'Legal', 'A3', 'A5'].map(format => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>PDF Margins</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Top"
                      value={widgetConfig.pdfMarginTop}
                      onChange={(e) => setWidgetConfig({...widgetConfig, pdfMarginTop: e.target.value})}
                    />
                    <Input
                      placeholder="Right"
                      value={widgetConfig.pdfMarginRight}
                      onChange={(e) => setWidgetConfig({...widgetConfig, pdfMarginRight: e.target.value})}
                    />
                    <Input
                      placeholder="Bottom"
                      value={widgetConfig.pdfMarginBottom}
                      onChange={(e) => setWidgetConfig({...widgetConfig, pdfMarginBottom: e.target.value})}
                    />
                    <Input
                      placeholder="Left"
                      value={widgetConfig.pdfMarginLeft}
                      onChange={(e) => setWidgetConfig({...widgetConfig, pdfMarginLeft: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
            
            {widgetConfig.outputType === 'screenshot' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="screenshotType">Screenshot Type</Label>
                  <select
                    id="screenshotType"
                    className="w-full border rounded px-3 py-2"
                    value={widgetConfig.screenshotType}
                    onChange={(e) => setWidgetConfig({...widgetConfig, screenshotType: e.target.value})}
                  >
                    {['png', 'jpeg', 'webp'].map(type => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="screenshotQuality">Quality (1-100)</Label>
                  <Input
                    id="screenshotQuality"
                    type="number"
                    min="1"
                    max="100"
                    value={widgetConfig.screenshotQuality}
                    onChange={(e) => setWidgetConfig({...widgetConfig, screenshotQuality: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                placeholder="Generate PDF"
                value={widgetConfig.buttonText}
                onChange={(e) => setWidgetConfig({...widgetConfig, buttonText: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embed Code */}
      {selectedKey && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Embed Code</CardTitle>
                <CardDescription>
                  Copy and paste this code into your website
                </CardDescription>
              </div>
              <Button onClick={() => copyToClipboard(generateEmbedCode(), 'Embed code')}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
              <code>{generateEmbedCode()}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


