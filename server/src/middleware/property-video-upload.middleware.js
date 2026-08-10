import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import multer from 'multer'

import { maximumVideoBytes, videoExtensions } from '../utils/property-video.js'

const temporaryDirectoryPrefix = 'syria-re-video-'

// A directory untouched for this long cannot belong to an upload still in
// flight, so removing it can never disturb a sibling process.
const staleTemporaryDirectoryMs = 24 * 60 * 60 * 1_000

// Bounds how much of the temporary disk a single process can hold at once:
// at most this many uploads of `maximumVideoBytes` each.
export const maximumConcurrentVideoUploads = 2

// One private directory per process. Names come from randomUUID, never from
// the client-supplied filename, so nothing can escape this directory.
const videoTemporaryDirectory = mkdtempSync(
  join(tmpdir(), temporaryDirectoryPrefix),
)

export async function removeTemporaryUpload(filePath) {
  if (!filePath) return
  try {
    await rm(filePath, { force: true })
  } catch {
    // A leftover temp file must never fail the request.
  }
}

/**
 * Removes upload directories abandoned by earlier process generations, which
 * a crash mid-upload can leave behind. Best effort and age-gated: a directory
 * a running process is still writing to is far younger than the threshold.
 */
async function removeStaleTemporaryDirectories(currentTime = Date.now()) {
  const root = tmpdir()
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (
        !entry.isDirectory() ||
        !entry.name.startsWith(temporaryDirectoryPrefix)
      ) {
        return
      }
      const directory = join(root, entry.name)
      if (directory === videoTemporaryDirectory) return
      try {
        const { mtimeMs } = await stat(directory)
        if (currentTime - mtimeMs < staleTemporaryDirectoryMs) return
        await rm(directory, { force: true, recursive: true })
      } catch {
        // A directory that cannot be inspected or removed is left alone.
      }
    }),
  )
}

// Fire and forget: startup must never wait on, or fail because of, cleanup.
void removeStaleTemporaryDirectories()

/**
 * Removes this process's own upload directory, partial files included. Called
 * during a graceful shutdown so nothing outlives the process that wrote it;
 * the age-gated sweep above then only ever has an unclean exit to clean up.
 */
export async function removeTemporaryUploadDirectory() {
  try {
    await rm(videoTemporaryDirectory, { force: true, recursive: true })
  } catch {
    // Shutdown must never fail because a temp directory could not be removed.
  }
}

function uploadError(code, message, statusCode = 400) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

function createMulterParser(directory) {
  return multer({
    storage: multer.diskStorage({
      destination: (_request, _file, callback) => callback(null, directory),
      filename: (_request, _file, callback) => callback(null, randomUUID()),
    }),
    limits: {
      fieldNameSize: 50,
      fieldSize: 1_000,
      fields: 1,
      fileSize: maximumVideoBytes,
      files: 1,
      parts: 2,
    },
    fileFilter(_request, file, callback) {
      if (!videoExtensions[file.mimetype]) {
        callback(
          uploadError(
            'INVALID_VIDEO_TYPE',
            'This video format is not supported.',
          ),
        )
        return
      }
      callback(null, true)
    },
  }).single('video')
}

export function createPropertyVideoUploadMiddleware({
  directory = videoTemporaryDirectory,
  maximumConcurrentUploads = maximumConcurrentVideoUploads,
  parser = createMulterParser(directory),
} = {}) {
  let activeUploads = 0

  return function parsePropertyVideoUpload(request, response, next) {
    // A declared body larger than the cap can only be rejected later by the
    // multer limit, after gigabytes have already reached the disk.
    const declaredBytes = Number(request.headers?.['content-length'])
    if (Number.isFinite(declaredBytes) && declaredBytes > maximumVideoBytes) {
      next(uploadError('VIDEO_TOO_LARGE', 'The video exceeds 4 GB.', 413))
      return
    }

    if (activeUploads >= maximumConcurrentUploads) {
      next(
        uploadError(
          'UPLOAD_BUSY',
          'Too many video uploads are in progress. Try again shortly.',
          503,
        ),
      )
      return
    }

    activeUploads += 1
    let released = false
    function releaseSlot() {
      if (released) return
      released = true
      activeUploads -= 1
    }
    // The slot is held for the whole request rather than for parsing alone,
    // so the temp file is always removed before the slot frees up. `close`
    // fires on success, on failure, and on a client abort alike, and the
    // guard above keeps a double emit from freeing a slot twice.
    response.once('close', releaseSlot)

    parser(request, response, async (error) => {
      if (!error) {
        next()
        return
      }

      // diskStorage may already have written a partial file before the limit
      // or filter rejected it.
      await removeTemporaryUpload(request.file?.path)

      if (error.code === 'LIMIT_FILE_SIZE') {
        next(uploadError('VIDEO_TOO_LARGE', 'The video exceeds 4 GB.', 413))
        return
      }
      if (error instanceof multer.MulterError) {
        next(
          uploadError(
            'INVALID_MULTIPART_REQUEST',
            'The multipart video request is invalid.',
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
          'The multipart video request is invalid.',
        ),
      )
    })
  }
}

export const parsePropertyVideoUpload =
  createPropertyVideoUploadMiddleware()
