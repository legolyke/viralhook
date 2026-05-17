import { S3Client, PutObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

// Ensure CORS is set on the bucket so browser direct-uploads work.
// Cached per cold start to avoid calling on every presign request.
let corsEnsured = false
async function ensureBucketCors() {
  if (corsEnsured) return
  try {
    await r2.send(new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ['*'],
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        }],
      },
    }))
    corsEnsured = true
  } catch (err) {
    console.error('[r2] Failed to set CORS:', err)
  }
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  await ensureBucketCors()
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export function getPublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

export function getR2KeyFromUrl(fileUrl: string): string {
  const prefix = `${process.env.R2_PUBLIC_URL}/`
  if (!fileUrl.startsWith(prefix)) {
    throw new Error(`URL does not belong to this R2 bucket: ${fileUrl}`)
  }
  return fileUrl.slice(prefix.length)
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  await r2.send(command)
}
