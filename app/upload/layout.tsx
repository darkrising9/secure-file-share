import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function UploadLayout({ children }: { children: React.ReactNode }) {
  // Get cookies correctly using await
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  // Redirect to login if no token found
  if (!token) {
    redirect('/login')
  }

  return <div>{children}</div>
}
