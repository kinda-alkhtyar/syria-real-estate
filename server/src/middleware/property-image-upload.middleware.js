import multer from 'multer'

import { maximumImageBytes } from '../utils/property-image.js'

const allowedDeclaredMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function uploadError(code, message, statusCode = 400) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

export function createPropertyImageUploadMiddleware() {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: {
      fieldNameSize: 50,
      fieldSize: 1_000,
      fields: 3,
      fileSize: maximumImageBytes,
      files: 1,
      parts: 4,
    },
    fileFilter(_request, file, callback) {
      if (!allowedDeclaredMimeTypes.has(file.mimetype)) {
        callback(
          uploadError(
            'INVALID_IMAGE_TYPE',
            'Only JPEG, PNG, and WebP images are accepted.',
          ),
        )
        return
      }
      callback(null, true)
    },
  }).single('image')

  return function parsePropertyImageUpload(request, response, next) {
    parser(request, response, (error) => {
      if (!error) {
        next()
        return
      }
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(uploadError('IMAGE_TOO_LARGE', 'The image exceeds 8 MiB.', 413))
        return
      }
      if (error instanceof multer.MulterError) {
        next(
          uploadError(
            'INVALID_MULTIPART_REQUEST',
            'The multipart image request is invalid.',
          ),
        )
        return
      }
      if (Number.isInteger(error.statusCode)) {
        next(error)
        return
      }
      next(
        uploadError(
          'INVALID_MULTIPART_REQUEST',
          'The multipart image request is invalid.',
        ),
      )
    })
  }
}

export const parsePropertyImageUpload =
  createPropertyImageUploadMiddleware()
