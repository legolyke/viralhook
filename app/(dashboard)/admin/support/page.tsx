import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSupportClient from '@/components/admin/AdminSupportClient'

const ADMIN_EMAIL = 'popescu2290@gmail.com'

export default async function AdminSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const service = createServiceClient()
  const { data: tickets } = await service
    .from('support_tickets')
    .select('id, user_id, user_email, subject, message, category, status, admin_reply, replied_at, created_at, attachment_url')
    .order('created_at', { ascending: false })

  return <AdminSupportClient tickets={tickets ?? []} />
}
