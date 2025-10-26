/**
 * Quick script to check if you have test data
 * Run this to see your current purchases and setup
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTestData() {
  console.log('🔍 Checking test data...\n')

  // Check users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.log('❌ Error fetching users:', usersError.message)
  } else {
    console.log(`✅ Users: ${users.users.length} total`)
    if (users.users.length > 0) {
      console.log(`   Latest user: ${users.users[0].email}\n`)
    } else {
      console.log('   ⚠️  No users found - you need to sign up!\n')
      return
    }
  }

  // Check purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('*, retailers(*), price_tracking(*)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (purchasesError) {
    console.log('❌ Error fetching purchases:', purchasesError.message)
  } else {
    console.log(`✅ Purchases: ${purchases.length} found`)

    if (purchases.length === 0) {
      console.log('   ⚠️  No purchases found - add a receipt to test!\n')
      console.log('   📝 Quick test: Upload a receipt at http://localhost:3000\n')
    } else {
      console.log('   Recent purchases:')
      purchases.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.merchant_name} - $${p.total_amount} (${p.purchase_date})`)
        console.log(`      ID: ${p.id}`)
        console.log(`      Has tracking: ${p.price_tracking?.length > 0 ? 'Yes' : 'No'}`)
        console.log(`      Retailer supports price match: ${p.retailers?.has_price_match ? 'Yes' : 'No'}`)
      })
      console.log()
    }
  }

  // Check refund requests
  const { data: refunds, error: refundsError } = await supabase
    .from('refund_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (refundsError) {
    console.log('❌ Error fetching refunds:', refundsError.message)
  } else {
    console.log(`✅ Refund Requests: ${refunds.length} found`)

    if (refunds.length === 0) {
      console.log('   ℹ️  No refunds yet - ready to test!\n')
    } else {
      console.log('   Recent refunds:')
      refunds.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.refund_type} - $${r.refund_amount} (${r.status})`)
        console.log(`      Sent: ${r.email_sent ? 'Yes' : 'No'}`)
      })
      console.log()
    }
  }

  // Check retailers
  const { data: retailers, error: retailersError } = await supabase
    .from('retailers')
    .select('name, has_price_match, return_policy_text')
    .limit(10)

  if (retailersError) {
    console.log('❌ Error fetching retailers:', retailersError.message)
  } else {
    const withPriceMatch = retailers.filter(r => r.has_price_match)
    const withPolicies = retailers.filter(r => r.return_policy_text)

    console.log(`✅ Retailers: ${retailers.length} total`)
    console.log(`   With price match: ${withPriceMatch.length}`)
    console.log(`   With policies: ${withPolicies.length}`)

    if (withPriceMatch.length > 0) {
      console.log(`   Price match retailers: ${withPriceMatch.map(r => r.name).join(', ')}`)
    }
    console.log()
  }

  console.log('✨ Test data check complete!\n')

  if (purchases.length > 0) {
    console.log('🎯 You\'re ready to test! Steps:')
    console.log('   1. Open http://localhost:3000')
    console.log('   2. Log in with your account')
    console.log('   3. Go to purchases/dashboard')
    console.log('   4. Click the green "Request Refund" button')
    console.log('   5. Follow the testing guide in TEST_REFUND_GENERATOR.md\n')
  } else {
    console.log('📝 Setup needed:')
    console.log('   1. Open http://localhost:3000')
    console.log('   2. Sign up or log in')
    console.log('   3. Upload a receipt (Upload tab or Paste text tab)')
    console.log('   4. Wait for processing')
    console.log('   5. Then you can test the refund generator!\n')
  }
}

checkTestData().catch(console.error)
