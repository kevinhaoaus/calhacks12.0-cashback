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
    <div className="min-h-screen bg-[#F7F5F3] font-sans">
      <header className="bg-white border-b border-[rgba(55,50,47,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-serif font-normal text-[#37322F] cursor-pointer hover:opacity-80 transition-opacity">Reclaim.AI</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/notifications">
                <Button variant="outline" className="relative border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans">
                  Notifications
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#B44D12] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <form action="/api/auth/signout" method="post">
                <Button type="submit" variant="outline" className="border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-serif font-normal text-[#37322F] mb-2">
            Welcome back, {user.user_metadata?.name || 'User'}
          </h2>
          <p className="text-[#605A57] text-lg font-sans">
            Your post-purchase money recovery dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Total Savings</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Potential money recovered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#16A34A]">
                ${totalSavings.toFixed(2)}
              </div>
              <p className="text-sm text-[#605A57] mt-2 font-sans">
                {purchases && purchases.length > 0
                  ? `${purchases.length} purchase${purchases.length !== 1 ? 's' : ''} tracked`
                  : 'No purchases tracked yet'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Active Purchases</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Items being tracked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#37322F]">{activePurchases}</div>
              <p className="text-sm text-[#605A57] mt-2 font-sans">
                {activePurchases === 0 ? 'Start by adding a receipt' : 'Being monitored'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Price Drops</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Price drops detected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#2563EB]">{priceDrops}</div>
              <p className="text-sm text-[#605A57] mt-2 font-sans">
                {priceDrops === 0 ? 'No price drops yet' : 'Refund opportunities'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Expiring Soon</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Return windows closing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#EA580C]">{expiringSoon}</div>
              <p className="text-sm text-[#605A57] mt-2 font-sans">
                {expiringSoon === 0 ? 'No urgent actions needed' : 'Within 7 days'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Forwarding Email */}
        <Card className="mb-8 bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="text-[#37322F] font-sans font-semibold">Your Forwarding Email</CardTitle>
            <CardDescription className="text-[#605A57] font-sans">
              Forward purchase receipts to this email to track them automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <code className="flex-1 bg-[rgba(55,50,47,0.05)] border border-[#E0DEDB] px-4 py-3 rounded-lg font-mono text-sm text-[#37322F]">
                {settings?.forward_email || 'Loading...'}
              </code>
              <CopyButton text={settings?.forward_email || ''} />
            </div>
            <p className="text-sm text-[#605A57] mt-4 font-sans">
              Forward any purchase confirmation email to this address, and we'll automatically extract the details using AI.
            </p>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        {purchases && purchases.length > 0 ? (
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Recent Purchases</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">
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
                      className="flex items-center justify-between p-4 border border-[#E0DEDB] rounded-lg hover:bg-[rgba(55,50,47,0.02)] transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-lg text-[#37322F] font-sans">{purchase.merchant_name}</h3>
                        <p className="text-sm text-[#605A57] font-sans">
                          ${purchase.total_amount.toFixed(2)} • {new Date(purchase.purchase_date).toLocaleDateString()}
                        </p>
                        {purchase.items && Array.isArray(purchase.items) && (
                          <p className="text-sm text-[#605A57] mt-1 font-sans">
                            {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                          </p>
                        )}
                        {purchase.price_tracking?.[0]?.price_drop_detected && (
                          <p className="text-sm text-[#2563EB] font-semibold mt-1 font-sans">
                            💰 Price dropped ${purchase.price_tracking[0].price_drop_amount?.toFixed(2)}!
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {daysUntil !== null && (
                          <>
                            <p className={`font-semibold font-sans ${
                              daysUntil < 7 ? 'text-[#EA580C]' :
                              daysUntil < 0 ? 'text-[#B44D12]' :
                              'text-[#16A34A]'
                            }`}>
                              {daysUntil < 0 ? 'Expired' : `${daysUntil} days left`}
                            </p>
                            <p className="text-sm text-[#605A57] font-sans">
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
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Getting Started</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">
                Start recovering money from your purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-l-[#37322F] pl-4 py-2">
                <h3 className="font-semibold mb-1 text-[#37322F] font-sans">Step 1: Forward Your Receipts</h3>
                <p className="text-sm text-[#605A57] font-sans">
                  Copy your forwarding email above and forward any purchase receipt to it
                </p>
              </div>
              <div className="border-l-4 border-l-[#37322F] pl-4 py-2">
                <h3 className="font-semibold mb-1 text-[#37322F] font-sans">Step 2: AI Analysis</h3>
                <p className="text-sm text-[#605A57] font-sans">
                  Claude AI automatically extracts purchase details and analyzes return policies
                </p>
              </div>
              <div className="border-l-4 border-l-[#37322F] pl-4 py-2">
                <h3 className="font-semibold mb-1 text-[#37322F] font-sans">Step 3: Track & Save</h3>
                <p className="text-sm text-[#605A57] font-sans">
                  We monitor prices and alert you to potential refund opportunities
                </p>
              </div>
              <div className="mt-4">
                <Link href="/test">
                  <Button className="bg-[#37322F] hover:bg-[#2A2520] text-white font-medium rounded-full shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset] font-sans">
                    Test with Sample Receipt
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
