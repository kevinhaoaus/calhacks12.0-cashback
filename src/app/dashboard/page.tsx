import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/copy-button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's purchases with price tracking
  const { data: purchases } = await supabase
    .from('purchases')
    .select(`
      *,
      retailers (
        name,
        default_return_days
      ),
      price_tracking (
        id,
        current_price,
        original_price,
        price_drop_detected,
        price_drop_amount,
        last_checked
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get unread notifications count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  // Get user settings for forwarding email
  let { data: settings } = await supabase
    .from('user_settings')
    .select('forward_email')
    .eq('user_id', user.id)
    .single()

  // Create user settings if they don't exist
  if (!settings) {
    const forwardEmail = `${user.id.slice(0, 8)}@reclaim.ai`
    const { data: newSettings } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        forward_email: forwardEmail,
      })
      .select()
      .single()
    settings = newSettings
  }

  // Calculate stats including price drops
  const totalSavings = purchases?.reduce((sum, p) => {
    const claudeSavings = p.claude_analysis?.money_recovery_potential?.total || 0
    const priceDropSavings = p.price_tracking?.[0]?.price_drop_amount || 0
    return sum + claudeSavings + priceDropSavings
  }, 0) || 0

  const priceDrops = purchases?.filter(p =>
    p.price_tracking?.[0]?.price_drop_detected
  ).length || 0

  const activePurchases = purchases?.filter(p => p.return_status === 'active').length || 0

  const expiringSoon = purchases?.filter(p => {
    if (!p.return_deadline) return false
    const deadline = new Date(p.return_deadline)
    const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7 && daysUntil >= 0
  }).length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Reclaim.AI</h1>
            <div className="flex items-center gap-4">
              <Link href="/notifications">
                <Button variant="outline" className="relative">
                  Notifications
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <form action="/api/auth/signout" method="post">
                <Button type="submit" variant="outline">
                  Sign out
                </Button>
              </form>
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Savings</CardTitle>
              <CardDescription>Potential money recovered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                ${totalSavings.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {purchases && purchases.length > 0
                  ? `${purchases.length} purchase${purchases.length !== 1 ? 's' : ''} tracked`
                  : 'No purchases tracked yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Purchases</CardTitle>
              <CardDescription>Items being tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{activePurchases}</div>
              <p className="text-sm text-gray-500 mt-2">
                {activePurchases === 0 ? 'Start by adding a receipt' : 'Being monitored'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price Drops</CardTitle>
              <CardDescription>Price drops detected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{priceDrops}</div>
              <p className="text-sm text-gray-500 mt-2">
                {priceDrops === 0 ? 'No price drops yet' : 'Refund opportunities'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expiring Soon</CardTitle>
              <CardDescription>Return windows closing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">{expiringSoon}</div>
              <p className="text-sm text-gray-500 mt-2">
                {expiringSoon === 0 ? 'No urgent actions needed' : 'Within 7 days'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Forwarding Email */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Forwarding Email</CardTitle>
            <CardDescription>
              Forward purchase receipts to this email to track them automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm">
                {settings?.forward_email || 'Loading...'}
              </code>
              <CopyButton text={settings?.forward_email || ''} />
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Forward any purchase confirmation email to this address, and we'll automatically extract the details using AI.
            </p>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        {purchases && purchases.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchases</CardTitle>
              <CardDescription>
                Your tracked purchases and return windows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchases.map((purchase) => {
                  const deadline = purchase.return_deadline ? new Date(purchase.return_deadline) : null
                  const daysUntil = deadline
                    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null

                  return (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <h3 className="font-semibold text-lg">{purchase.merchant_name}</h3>
                        <p className="text-sm text-gray-600">
                          ${purchase.total_amount.toFixed(2)} • {new Date(purchase.purchase_date).toLocaleDateString()}
                        </p>
                        {purchase.items && Array.isArray(purchase.items) && (
                          <p className="text-sm text-gray-500 mt-1">
                            {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                          </p>
                        )}
                        {purchase.price_tracking?.[0]?.price_drop_detected && (
                          <p className="text-sm text-blue-600 font-semibold mt-1">
                            💰 Price dropped ${purchase.price_tracking[0].price_drop_amount?.toFixed(2)}!
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {daysUntil !== null && (
                          <>
                            <p className={`font-semibold ${
                              daysUntil < 7 ? 'text-orange-600' :
                              daysUntil < 0 ? 'text-red-600' :
                              'text-green-600'
                            }`}>
                              {daysUntil < 0 ? 'Expired' : `${daysUntil} days left`}
                            </p>
                            <p className="text-sm text-gray-500">
                              Return by {deadline?.toLocaleDateString()}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Start recovering money from your purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold mb-1">Step 1: Forward Your Receipts</h3>
                <p className="text-sm text-gray-600">
                  Copy your forwarding email above and forward any purchase receipt to it
                </p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold mb-1">Step 2: AI Analysis</h3>
                <p className="text-sm text-gray-600">
                  Claude AI automatically extracts purchase details and analyzes return policies
                </p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold mb-1">Step 3: Track & Save</h3>
                <p className="text-sm text-gray-600">
                  We monitor prices and alert you to potential refund opportunities
                </p>
              </div>
              <div className="mt-4">
                <Link href="/test">
                  <Button>Test with Sample Receipt</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
