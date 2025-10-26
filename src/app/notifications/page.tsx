'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  priority: string
  read: boolean
  created_at: string
  purchases?: {
    merchant_name: string
    total_amount: number
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })
      // Update local state
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_drop':
        return '💰'
      case 'return_expiring':
        return '⏰'
      case 'refund_update':
        return '✅'
      default:
        return '📢'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-l-red-500'
      case 'high':
        return 'border-l-4 border-l-orange-500'
      case 'normal':
        return 'border-l-4 border-l-blue-500'
      default:
        return 'border-l-4 border-l-gray-300'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-gray-600 font-semibold mb-1">No notifications yet</p>
              <p className="text-sm text-gray-500">
                You'll see price drops, return deadlines, and other updates here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${getPriorityColor(notification.priority)} ${
                  notification.read ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div>
                        <CardTitle className="text-lg">
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                              New
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{notification.message}</p>
                  {notification.purchases && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700">
                        {notification.purchases.merchant_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        ${notification.purchases.total_amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
