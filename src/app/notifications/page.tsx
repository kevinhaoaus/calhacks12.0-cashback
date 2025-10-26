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
        return 'border-l-4 border-l-[#B44D12]'
      case 'high':
        return 'border-l-4 border-l-[#EA580C]'
      case 'normal':
        return 'border-l-4 border-l-[#37322F]'
      default:
        return 'border-l-4 border-l-[#E0DEDB]'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-[#F7F5F3] font-sans">
      <header className="bg-white border-b border-[rgba(55,50,47,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/">
                <h1 className="text-2xl font-serif font-normal text-[#37322F] cursor-pointer hover:opacity-80 transition-opacity">FairVal</h1>
              </Link>
              {unreadCount > 0 && (
                <p className="text-sm text-[#605A57] mt-1 font-sans">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="border-[#E0DEDB] text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-serif font-normal text-[#37322F] mb-2">Notifications</h2>
          <p className="text-[#605A57] text-lg font-sans">
            Stay updated on price drops, return deadlines, and refund opportunities
          </p>
        </div>

        {loading ? (
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mx-auto mb-4" />
              <p className="text-[#605A57] font-sans">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="bg-white border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]">
            <CardContent className="py-12 text-center">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-[#37322F] font-semibold mb-2 text-lg font-sans">No notifications yet</p>
              <p className="text-sm text-[#605A57] font-sans">
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
                  notification.read ? 'bg-white' : 'bg-[#FFFBEB]'
                } border-[rgba(55,50,47,0.12)] shadow-[0px_0px_0px_0.9px_rgba(0,0,0,0.08)]`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div>
                        <CardTitle className="text-lg text-[#37322F] font-sans font-semibold">
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#37322F] text-white">
                              New
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 text-[#605A57] font-sans">
                          {new Date(notification.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-[#605A57] hover:text-[#37322F] hover:bg-[rgba(55,50,47,0.05)] font-sans"
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[#37322F] font-sans">{notification.message}</p>
                  {notification.purchases && (
                    <div className="mt-3 p-3 bg-[rgba(55,50,47,0.05)] border border-[#E0DEDB] rounded-lg">
                      <p className="text-sm font-semibold text-[#37322F] font-sans">
                        {notification.purchases.merchant_name}
                      </p>
                      <p className="text-sm text-[#605A57] font-sans">
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
