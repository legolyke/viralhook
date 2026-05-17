import { createServiceClient } from '@/lib/supabase/server'

export const SUPERADMIN_EMAIL = 'popescu2290@gmail.com'

export async function isAdmin(userId: string, email: string | null | undefined): Promise<boolean> {
  if (email === SUPERADMIN_EMAIL) return true
  const service = createServiceClient()
  const { data } = await service
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}
