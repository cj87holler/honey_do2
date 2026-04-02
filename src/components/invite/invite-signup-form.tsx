"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { authClient } from "@/lib/auth-client"
import { acceptInviteAsCurrentUser } from "@/lib/actions/invite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"

const signupSchema = z.object({
  name: z.string().min(1, "Enter your name.").max(100, "Name must be 100 characters or fewer."),
  email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter a password.").min(8, "Password must be at least 8 characters."),
})
type SignupValues = z.infer<typeof signupSchema>

interface InviteSignupFormProps {
  token: string
  hiveId: string
  hiveName: string
}

export function InviteSignupForm({ token, hiveId, hiveName }: InviteSignupFormProps) {
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

    // Chain: join the Hive after account creation
    try {
      await acceptInviteAsCurrentUser(token)
      router.push(`/hive/${hiveId}`)
    } catch {
      // Orphaned account fallback — redirect to /hive which handles no-hive users
      router.push("/hive")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-stone-800">Create your account to join {hiveName}</h2>
      {serverError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="invite-name"
          label="Your name"
          placeholder="How your hivemates will see you"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          id="invite-email"
          type="email"
          label="Email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          id="invite-password"
          type="password"
          label="Password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Joining..." : "Sign up & join"}
        </Button>
      </form>
    </div>
  )
}
