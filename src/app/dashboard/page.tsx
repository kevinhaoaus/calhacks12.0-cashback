import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Reclaim.AI</h1>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.user_metadata?.name || 'User'}!
          </h2>
          <p className="text-gray-600">
            Your post-purchase money recovery dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Savings</CardTitle>
              <CardDescription>Potential money recovered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">$0.00</div>
              <p className="text-sm text-gray-500 mt-2">No purchases tracked yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Purchases</CardTitle>
              <CardDescription>Items being tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">0</div>
              <p className="text-sm text-gray-500 mt-2">Start by adding a receipt</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expiring Soon</CardTitle>
              <CardDescription>Return windows closing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">0</div>
              <p className="text-sm text-gray-500 mt-2">No urgent actions needed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Start recovering money from your purchases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold mb-1">Step 1: Connect Your Email</h3>
              <p className="text-sm text-gray-600">
                Forward your purchase receipts to your unique Reclaim.AI email address
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold mb-1">Step 2: AI Analysis</h3>
              <p className="text-sm text-gray-600">
                Claude AI automatically extracts purchase details and analyzes return policies
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold mb-1">Step 3: Price Tracking</h3>
              <p className="text-sm text-gray-600">
                We monitor prices and alert you to potential refund opportunities
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold mb-1">Step 4: Automated Refunds</h3>
              <p className="text-sm text-gray-600">
                Generate and send refund requests with AI-powered emails
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
