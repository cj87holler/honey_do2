"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter a password."),
})
type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginValues) => {
    setServerError(null)
    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    })
    if (result.error) {
      setServerError("Incorrect email or password.")
      return
    }
    router.push("/hive")
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-bee">Welcome back</h1>
      {serverError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="email"
          type="email"
          label="Email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          id="password"
          type="password"
          label="Password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Loading..." : "Log in"}
        </Button>
      </form>
      <p className="text-center text-sm text-stone-500">
        <Link href="/signup" className="text-honey hover:underline">
          Don&apos;t have an account? Sign up
        </Link>
      </p>
    </div>
  )
}
