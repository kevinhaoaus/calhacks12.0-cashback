'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3] p-4 font-sans">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <img
          src="/mask-group-pattern.svg"
          alt=""
          className="w-full h-full object-cover mix-blend-multiply"
          style={{
            filter: "hue-rotate(15deg) saturate(0.7) brightness(1.2)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-4xl font-serif font-normal text-[#37322F] mb-2 cursor-pointer hover:opacity-80 transition-opacity">
              FairVal
            </h1>
          </Link>
          <p className="text-[#605A57] text-base font-medium">
            Start recovering money from your purchases
          </p>
        </div>

        <Card className="bg-white shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)] border-[rgba(55,50,47,0.12)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-semibold text-[#37322F] font-sans">Create Account</CardTitle>
            <CardDescription className="text-[#605A57] font-sans">
              Join thousands who reclaim money every day
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-[#B44D12] bg-[#FEF3F2] border border-[#FECDCA] rounded-lg font-sans">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#37322F] font-medium font-sans">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-[#E0DEDB] focus:border-[#37322F] focus:ring-[#37322F] font-sans"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#37322F] font-medium font-sans">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-[#E0DEDB] focus:border-[#37322F] focus:ring-[#37322F] font-sans"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#37322F] font-medium font-sans">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="border-[#E0DEDB] focus:border-[#37322F] focus:ring-[#37322F] font-sans"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-[#37322F] hover:bg-[#2A2520] text-white font-medium rounded-full shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset] font-sans transition-colors"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
              <p className="text-sm text-center text-[#605A57] font-sans">
                Already have an account?{' '}
                <Link href="/login" className="text-[#37322F] hover:underline font-semibold">
                  Login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center mt-6">
          <Link href="/">
            <Button variant="ghost" className="text-[#605A57] hover:text-[#37322F] font-sans">
              ← Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
