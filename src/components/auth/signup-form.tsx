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

const signupSchema = z.object({
  name: z.string().min(1, "Enter your name.").max(100, "Name must be 100 characters or fewer."),
  email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter a password.").min(8, "Password must be at least 8 characters."),
})
type SignupValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupValues) => {
    setServerError(null)
    const result = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    })
    if (result.error) {
      const msg = result.error.message ?? ""
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
        setServerError("That email is already registered. Try logging in instead.")
      } else {
        setServerError("Something went wrong. Please try again.")
      }
      return
    }
    router.push("/hive/create")
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-bee">Create your account</h1>
      {serverError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="name"
          label="Your name"
          placeholder="How your hivemates will see you"
          error={errors.name?.message}
          {...register("name")}
        />
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
          {isSubmitting ? "Loading..." : "Sign up"}
        </Button>
      </form>
      <p className="text-center text-sm text-stone-500">
        <Link href="/login" className="text-honey hover:underline">
          Already have an account? Log in
        </Link>
      </p>
    </div>
  )
}
