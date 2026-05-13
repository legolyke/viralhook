// lib/upload-validator.ts
export const PLAN_LIMITS = {
  free:    { maxDurationSeconds: 30 * 60 },
  creator: { maxDurationSeconds: 2 * 60 * 60 },
  pro:     { maxDurationSeconds: 4 * 60 * 60 },
  agency:  { maxDurationSeconds: 6 * 60 * 60 },
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
