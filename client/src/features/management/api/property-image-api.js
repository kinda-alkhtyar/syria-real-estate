import { apiRequest } from '../../../api/api-client.js'

const altTextFields = ['altEn', 'altAr', 'altDe']

export function createPropertyImageApi({ request = apiRequest } = {}) {
  function imagesPath(propertyId) {
    return `/api/v1/properties/${propertyId}/images`
  }

  async function requestImageList(path, options) {
    const response = await request(path, options)
    if (!Array.isArray(response?.data)) {
      throw new TypeError('The property image response is invalid.')
    }
    return response.data
  }

  return {
    async uploadImage(propertyId, file, altText = {}, { signal } = {}) {
      const body = new FormData()
      body.append('image', file)
      // Alt text is optional server-side, and empty strings fail its schema.
      for (const field of altTextFields) {
        const value = altText[field]?.trim()
        if (value) body.append(field, value)
      }

      const response = await request(imagesPath(propertyId), {
        body,
        method: 'POST',
        signal,
      })
      if (!response?.data?.id) {
        throw new TypeError('The property image response is invalid.')
      }
      return response.data
    },

    reorderImages(propertyId, imageIds, { signal } = {}) {
      return requestImageList(`${imagesPath(propertyId)}/order`, {
        body: { imageIds },
        method: 'PATCH',
        signal,
      })
    },

    setPrimaryImage(propertyId, imageId, { signal } = {}) {
      return requestImageList(
        `${imagesPath(propertyId)}/${imageId}/primary`,
        { method: 'PATCH', signal },
      )
    },

    async deleteImage(propertyId, imageId, { signal } = {}) {
      await request(`${imagesPath(propertyId)}/${imageId}`, {
        method: 'DELETE',
        signal,
      })
    },
  }
}

const propertyImageApi = createPropertyImageApi()

export const {
  deleteImage,
  reorderImages,
  setPrimaryImage,
  uploadImage,
} = propertyImageApi
