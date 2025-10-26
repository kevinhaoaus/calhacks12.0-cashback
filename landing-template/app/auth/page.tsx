"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupName, setSignupName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate fields
    const newErrors: { [key: string]: string } = {}
    if (!loginEmail) newErrors.loginEmail = "Email is required"
    if (!loginPassword) newErrors.loginPassword = "Password is required"
    if (!loginEmail.includes("@")) newErrors.loginEmail = "Please enter a valid email"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)

    // In a real app, you would handle the response here
    console.log("[v0] Login submitted:", { loginEmail, loginPassword })
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate fields
    const newErrors: { [key: string]: string } = {}
    if (!signupName) newErrors.signupName = "Name is required"
    if (!signupEmail) newErrors.signupEmail = "Email is required"
    if (!signupPassword) newErrors.signupPassword = "Password is required"
    if (!signupEmail.includes("@")) newErrors.signupEmail = "Please enter a valid email"
    if (signupPassword.length < 8) newErrors.signupPassword = "Password must be at least 8 characters"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)

    // In a real app, you would handle the response here
    console.log("[v0] Signup submitted:", { signupName, signupEmail, signupPassword })
  }

  return (
    <div className="min-h-screen bg-[#f7f5f3] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-[#37322f] font-semibold text-2xl hover:opacity-80 font-serif">
            Reclaim.AI
          </Link>
        </div>

        {/* Flip Card Container */}
        <div className="relative" style={{ perspective: "1000px" }}>
          <div
            className="relative transition-transform duration-700 ease-in-out"
            style={{
              transformStyle: "preserve-3d",
              transform: isLogin ? "rotateY(0deg)" : "rotateY(180deg)",
            }}
          >
            {/* Login Card (Front) */}
            <div
              className="bg-white rounded-2xl border border-[#37322f]/10 p-8 shadow-sm"
              style={{
                backfaceVisibility: "hidden",
              }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-[#37322f] mb-2 font-serif">Welcome back</h1>
                <p className="text-[#37322f]/60 text-sm">Log in to your Reclaim.AI account</p>
              </div>

              <form className="space-y-6" onSubmit={handleLoginSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-[#37322f] text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={`bg-[#f7f5f3] border-[#37322f]/10 text-[#37322f] placeholder:text-[#37322f]/40 transition-colors ${
                      errors.loginEmail ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                  {errors.loginEmail && <p className="text-xs text-red-500 mt-1">{errors.loginEmail}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-[#37322f] text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-[#37322f]/60 hover:text-[#37322f] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={`bg-[#f7f5f3] border-[#37322f]/10 text-[#37322f] placeholder:text-[#37322f]/40 transition-colors ${
                      errors.loginPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                  {errors.loginPassword && <p className="text-xs text-red-500 mt-1">{errors.loginPassword}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#37322f] hover:bg-[#37322f]/90 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : (
                    "Log in"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#37322f]/60">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-[#37322f] font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>

            {/* Signup Card (Back) */}
            <div
              className="absolute top-0 left-0 w-full bg-white rounded-2xl border border-[#37322f]/10 p-8 shadow-sm"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-[#37322f] mb-2 font-serif">Start reclaiming money</h1>
                <p className="text-[#37322f]/60 text-sm">Create your account and never lose money again</p>
              </div>

              <form className="space-y-6" onSubmit={handleSignupSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-[#37322f] text-sm font-medium">
                    Full name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className={`bg-[#f7f5f3] border-[#37322f]/10 text-[#37322f] placeholder:text-[#37322f]/40 transition-colors ${
                      errors.signupName ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                  {errors.signupName && <p className="text-xs text-red-500 mt-1">{errors.signupName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-[#37322f] text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={`bg-[#f7f5f3] border-[#37322f]/10 text-[#37322f] placeholder:text-[#37322f]/40 transition-colors ${
                      errors.signupEmail ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                  {errors.signupEmail && <p className="text-xs text-red-500 mt-1">{errors.signupEmail}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-[#37322f] text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className={`bg-[#f7f5f3] border-[#37322f]/10 text-[#37322f] placeholder:text-[#37322f]/40 transition-colors ${
                      errors.signupPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-[#37322f]/40">Must be at least 8 characters</p>
                  {errors.signupPassword && <p className="text-xs text-red-500 mt-1">{errors.signupPassword}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#37322f] hover:bg-[#37322f]/90 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#37322f]/60">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-[#37322f] font-medium hover:underline"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#37322f]/40 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
