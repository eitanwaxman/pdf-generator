import { useEffect } from 'react'

/**
 * StructuredData Component - Adds JSON-LD structured data to the page
 * Supports both single schema objects and arrays of schemas
 */
export default function StructuredData({ data }) {
  useEffect(() => {
    if (!data) return

    // Handle both single schema and array of schemas
    const schemas = Array.isArray(data) ? data : [data]

    // Remove existing structured data scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]')
    existingScripts.forEach(script => {
      if (script.id && script.id.startsWith('structured-data-')) {
        script.remove()
      }
    })

    // Create script elements for each schema
    schemas.forEach((schema, index) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.text = JSON.stringify(schema)
      script.id = `structured-data-${index}`
      document.head.appendChild(script)
    })

    // Cleanup
    return () => {
      const scriptsToRemove = document.querySelectorAll('script[type="application/ld+json"]')
      scriptsToRemove.forEach(script => {
        if (script.id && script.id.startsWith('structured-data-')) {
          script.remove()
        }
      })
    }
  }, [data])

  return null
}

/**
 * Helper functions to generate common structured data schemas
 */
export const generateOrganizationSchema = (baseUrl) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Docuskribe',
  url: baseUrl,
  logo: `${baseUrl}/logo.png`, // Update with actual logo URL
  description: 'A simple, reliable PDF and screenshot generation API with fast rendering, queue-backed workers, and fair pricing.',
  sameAs: [
    // Add social media links if available
  ],
})

export const generateSoftwareApplicationSchema = (baseUrl) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Docuskribe API',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description: 'Generate beautiful PDFs and screenshots from URLs with a simple, reliable API.',
  url: baseUrl,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.5',
    ratingCount: '1',
  },
})

export const generateWebSiteSchema = (baseUrl) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Docuskribe',
  url: baseUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${baseUrl}/docs?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
})

export const generateBreadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
})

