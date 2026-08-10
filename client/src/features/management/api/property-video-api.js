import { apiRequest } from '../../../api/api-client.js'

export function createPropertyVideoApi({ request = apiRequest } = {}) {
  function videoPath(propertyId) {
    return `/api/v1/properties/${propertyId}/video`
  }

  return {
    async uploadVideo(propertyId, file, { signal } = {}) {
      const body = new FormData()
      body.append('video', file)

      const response = await request(videoPath(propertyId), {
        body,
        method: 'POST',
        signal,
      })
      if (!response?.data?.url) {
        throw new TypeError('The property video response is invalid.')
      }
      return response.data
    },

    async deleteVideo(propertyId, { signal } = {}) {
      await request(videoPath(propertyId), { method: 'DELETE', signal })
    },
  }
}

const propertyVideoApi = createPropertyVideoApi()

export const { deleteVideo, uploadVideo } = propertyVideoApi
