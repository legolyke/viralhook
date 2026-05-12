import LoginForm from '@/components/auth/LoginForm'

interface Props {
  searchParams: Promise<{ message?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  return <LoginForm message={params.message} errorParam={params.error} />
}
