"use client"

import { signIn } from "next-auth/react"

export function LoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-lg border px-4 py-2"
    >
      Login with Google
    </button>
  )
}