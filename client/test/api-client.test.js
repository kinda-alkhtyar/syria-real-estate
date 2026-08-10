import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ApiError,
  createApiClient,
} from '../src/api/api-client.js'

const baseUrl = 'https://api.example'

function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

test('JSON requests preserve serialization and headers', async () => {
  let request
  const client = createApiClient({
    baseUrl,
    async fetchImplementation(url, options) {
      request = { options, url }
      return jsonResponse({ data: { id: 'property-id' } }, { status: 201 })
    },
  })

  const response = await client.request('/api/v1/properties', {
    body: { titleEn: 'Home' },
    method: 'POST',
  })

  assert.equal(request.url, `${baseUrl}/api/v1/properties`)
  assert.equal(request.options.body, JSON.stringify({ titleEn: 'Home' }))
  assert.equal(request.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(response, { data: { id: 'property-id' } })
})

test('FormData requests keep the body and let fetch set the boundary', async () => {
  let request
  const form = new FormData()
  form.append('image', new Blob(['image']), 'property.webp')
  form.append('altEn', 'Property')
  const client = createApiClient({
    baseUrl,
    async fetchImplementation(url, options) {
      request = { options, url }
      return jsonResponse({ data: { id: 'image-id' } }, { status: 201 })
    },
  })

  await client.request('/api/v1/properties/property-id/images', {
    body: form,
    method: 'POST',
  })

  assert.equal(request.options.body, form)
  assert.ok(!('Content-Type' in request.options.headers))
  assert.equal(request.options.headers.Accept, 'application/json')
})

test('every request includes browser credentials', async () => {
  const requests = []
  const client = createApiClient({
    baseUrl,
    async fetchImplementation(_url, options) {
      requests.push(options)
      return jsonResponse({ data: [] }, { status: 200 })
    },
  })

  await client.request('/api/v1/management/properties')
  await client.request('/api/v1/properties', {
    body: { slug: 'home' },
    method: 'POST',
  })
  await client.request('/api/v1/properties/property-id/images', {
    body: new FormData(),
    method: 'POST',
  })

  assert.deepEqual(
    requests.map(({ credentials }) => credentials),
    ['include', 'include', 'include'],
  )
})

test('structured HTTP errors preserve status, code, and safe message', async () => {
  const client = createApiClient({
    baseUrl,
    async fetchImplementation() {
      return jsonResponse(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'The request is invalid.',
          },
        },
        { status: 400 },
      )
    },
  })

  await assert.rejects(
    client.request('/api/v1/properties', {
      body: {},
      method: 'POST',
    }),
    (error) =>
      error instanceof ApiError &&
      error.status === 400 &&
      error.code === 'INVALID_REQUEST' &&
      error.message === 'The request is invalid.',
  )
})

test('network failures are distinct from HTTP errors', async () => {
  const client = createApiClient({
    baseUrl,
    async fetchImplementation() {
      throw new TypeError('Failed to fetch')
    },
  })

  await assert.rejects(
    client.request('/api/v1/management/properties'),
    (error) =>
      error instanceof ApiError &&
      error.status === 0 &&
      error.code === 'NETWORK_ERROR' &&
      error.message === 'The API request could not be completed.',
  )
})
