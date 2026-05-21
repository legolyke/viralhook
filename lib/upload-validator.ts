// lib/upload-validator.ts
const GB = 1024 * 1024 * 1024

export const PLAN_LIMITS = {
  free:    { maxDurationSeconds: 30 * 60,     maxFileSizeBytes: 2 * GB },
  creator: { maxDurationSeconds: 2 * 60 * 60, maxFileSizeBytes: 5 * GB },
  pro:     { maxDurationSeconds: 4 * 60 * 60, maxFileSizeBytes: 10 * GB },
  agency:  { maxDurationSeconds: 6 * 60 * 60, maxFileSizeBytes: 20 * GB },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export const ACCEPTED_EXTENSIONS = ['.mp4', '.mov']

export function validateFileFormat(fileName: string): { valid: boolean; error?: string } {
  const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Only MP4 and MOV files are supported.' }
  }
  return { valid: true }
}

export function validateFileSize(
  fileSizeBytes: number,
  plan: Plan
): { valid: boolean; error?: string } {
  const limit = PLAN_LIMITS[plan].maxFileSizeBytes
  if (fileSizeBytes > limit) {
    const limitGB = limit / GB
    return {
      valid: false,
      error: `Your ${plan.toUpperCase()} plan supports files up to ${limitGB}GB. Upgrade to upload larger files.`,
    }
  }
  return { valid: true }
}

export function validateDuration(
  durationSeconds: number,
  plan: Plan
): { valid: boolean; error?: string } {
  const limit = PLAN_LIMITS[plan].maxDurationSeconds
  if (durationSeconds > limit) {
    const hours = limit / 3600
    const limitLabel = hours >= 1 ? `${hours}h` : `${Math.round(limit / 60)} min`
    return {
      valid: false,
      error: `Your ${plan.toUpperCase()} plan supports max ${limitLabel} videos. Upgrade to upload longer content.`,
    }
  }
  return { valid: true }
}
