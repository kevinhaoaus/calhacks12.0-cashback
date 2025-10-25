import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Reclaim.AI</h1>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Automatically Recover Money From Your Purchases
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Track return deadlines, monitor price drops, and generate refund requests with AI-powered automation
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started Free
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <CardTitle>Email Receipt Forwarding</CardTitle>
              <CardDescription>
                Simply forward your purchase receipts to your unique Reclaim.AI email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Our AI automatically extracts merchant, date, items, and total from any receipt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <CardTitle>AI-Powered Analysis</CardTitle>
              <CardDescription>
                Claude AI analyzes return policies and tracks price changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Get intelligent recommendations on when to return or request refunds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <CardTitle>Automated Refunds</CardTitle>
              <CardDescription>
                Generate and send professional refund request emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                AI writes personalized emails based on merchant policies and your purchase history
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h3 className="text-3xl font-bold text-center mb-8">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Forward Receipt</h4>
              <p className="text-sm text-gray-600">
                Send purchase confirmations to your Reclaim email
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">AI Processing</h4>
              <p className="text-sm text-gray-600">
                Claude extracts data and analyzes return policies
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Price Tracking</h4>
              <p className="text-sm text-gray-600">
                We monitor prices and alert you to drops
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold mb-2">Recover Money</h4>
              <p className="text-sm text-gray-600">
                Generate refund requests with one click
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to start saving?</h3>
          <p className="text-gray-600 mb-6">
            Join thousands recovering money from their purchases
          </p>
          <Link href="/signup">
            <Button size="lg">Create Your Free Account</Button>
          </Link>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <p className="text-center text-gray-600">
          © 2025 Reclaim.AI - Powered by Anthropic Claude, Bright Data, and Postman
        </p>
      </footer>
    </div>
  )
}
