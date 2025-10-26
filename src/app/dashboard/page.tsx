import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/copy-button'
import { PriceTrackingList } from '@/components/price-tracking-list'
import { PurchasesList } from '@/components/purchases-list'
import { AddReceipt } from '@/components/add-receipt'
import Link from 'next/link'

// Disable caching for this page - always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's purchases with price tracking
  const { data: purchases, error: purchasesError } = await supabase
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
        last_checked,
        tracking_active
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (purchasesError) {
    console.error('Error fetching purchases:', purchasesError)
  }

  console.log('Dashboard data:', {
    purchasesCount: purchases?.length || 0,
    purchasesWithTracking: purchases?.filter(p => p.price_tracking?.length > 0).length || 0,
    purchases: purchases?.map(p => ({
      id: p.id,
      merchant: p.merchant_name,
      hasTracking: !!p.price_tracking?.length,
      trackingActive: p.price_tracking?.[0]?.tracking_active
    }))
  })

  // Get unread notifications count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  // Get refund requests data
  const { data: refundRequests, error: refundError } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('user_id', user.id)

  if (refundError) {
    console.error('Error fetching refund requests:', refundError)
  }

  console.log('Refund requests:', {
    total: refundRequests?.length || 0,
    sent: refundRequests?.filter(r => r.email_sent).length || 0,
    approved: refundRequests?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0,
    requests: refundRequests?.map(r => ({
      id: r.id,
      type: r.refund_type,
      amount: r.refund_amount,
      status: r.status,
      email_sent: r.email_sent
    }))
  })

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

  // Calculate refund metrics
  const realizedSavings = refundRequests?.reduce((sum, r) => {
    // Only count approved or completed refunds as realized
    if (r.status === 'approved' || r.status === 'completed') {
      return sum + (r.refund_amount || 0)
    }
    return sum
  }, 0) || 0

  const refundsSent = refundRequests?.filter(r => r.email_sent === true).length || 0
  const refundsApproved = refundRequests?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0

  // Calculate potential savings from price drops
  const potentialSavings = purchases?.reduce((sum, p) => {
    // Only count price drop amounts where a drop was detected
    if (p.price_tracking?.[0]?.price_drop_detected && p.price_tracking?.[0]?.price_drop_amount) {
      return sum + p.price_tracking[0].price_drop_amount
    }
    return sum
  }, 0) || 0

  // Total savings = realized (approved refunds) + potential (price drops)
  const totalSavings = realizedSavings + potentialSavings

  // Count purchases with price drops detected
  const priceDrops = purchases?.filter(p =>
    p.price_tracking?.[0]?.price_drop_detected === true
  ).length || 0

  console.log('Calculated metrics:', {
    realizedSavings,
    potentialSavings,
    totalSavings,
    priceDrops,
    priceTrackingData: purchases?.map(p => ({
      merchant: p.merchant_name,
      hasPriceTracking: !!p.price_tracking?.[0],
      priceDropDetected: p.price_tracking?.[0]?.price_drop_detected,
      priceDropAmount: p.price_tracking?.[0]?.price_drop_amount,
      originalPrice: p.price_tracking?.[0]?.original_price,
      currentPrice: p.price_tracking?.[0]?.current_price
    }))
  })

  // Count items with active price tracking
  const activePurchases = purchases?.filter(p => p.price_tracking?.[0]?.tracking_active === true).length || 0

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
              <h1 className="text-2xl font-serif font-normal text-[#37322F] cursor-pointer hover:opacity-80 transition-opacity">FairVal</h1>
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
              <CardDescription className="text-[#605A57] font-sans">Realized + Potential</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#16A34A]">
                ${totalSavings.toFixed(2)}
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-[#16A34A] font-sans font-semibold">
                  ${realizedSavings.toFixed(2)} realized
                </p>
                <p className="text-xs text-[#605A57] font-sans">
                  ${potentialSavings.toFixed(2)} potential
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Items Tracked</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Active price monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#37322F]">{activePurchases}</div>
              <p className="text-sm text-[#605A57] mt-2 font-sans">
                {activePurchases === 0
                  ? 'Start by adding a receipt'
                  : `${activePurchases} item${activePurchases !== 1 ? 's' : ''} being monitored`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-[#37322F] font-sans font-semibold">Price Drops</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Opportunities found</CardDescription>
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
              <CardTitle className="text-[#37322F] font-sans font-semibold">Refunds</CardTitle>
              <CardDescription className="text-[#605A57] font-sans">Requests submitted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#EA580C]">{refundsSent}</div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-[#16A34A] font-sans font-semibold">
                  {refundsApproved} approved
                </p>
                <p className="text-xs text-[#605A57] font-sans">
                  ${realizedSavings.toFixed(2)} recovered
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Receipt */}
        <Card className="mb-8 bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="text-[#37322F] font-sans font-semibold">Add Receipt</CardTitle>
            <CardDescription className="text-[#605A57] font-sans">
              Upload a photo or paste receipt text to add a new purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddReceipt />
          </CardContent>
        </Card>

        {/* Price Tracking */}
        <Card className="mb-8 bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="text-[#37322F] font-sans font-semibold">Price Tracking</CardTitle>
            <CardDescription className="text-[#605A57] font-sans">
              Products being monitored for price drops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceTrackingList />
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
              <PurchasesList purchases={purchases} />
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
                <h3 className="font-semibold mb-1 text-[#37322F] font-sans">Step 1: Upload Your Receipts</h3>
                <p className="text-sm text-[#605A57] font-sans">
                  Upload a photo or paste text from your purchase receipts above
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
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
