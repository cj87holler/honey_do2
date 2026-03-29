"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createHive } from "@/lib/actions/hive"

const hiveSchema = z.object({
  name: z
    .string()
    .min(1, "Give your Hive a name.")
    .max(100, "Hive name must be 100 characters or fewer."),
})

type HiveFormValues = z.infer<typeof hiveSchema>

export function CreateHiveForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HiveFormValues>({
    resolver: zodResolver(hiveSchema),
  })

  async function onSubmit(values: HiveFormValues) {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set("name", values.name)
      await createHive(formData)
    } catch (err) {
      // createHive redirects on success, so any error here is a server error
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold text-bee mb-2">Create your Hive</h1>
      <p className="text-base text-stone-500 mb-8">
        Give your Hive a name. You can change it anytime.
      </p>

      {serverError && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="hive-name"
            className="block text-base font-medium text-bee"
          >
            Hive name
          </label>
          <input
            id="hive-name"
            type="text"
            placeholder="The Johnson Family"
            className="w-full rounded border border-stone-200 bg-stone-50 px-3 py-2 text-base text-bee placeholder-stone-400 focus:border-honey focus:outline-none focus:ring-1 focus:ring-honey"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-honey px-4 py-2 text-base font-medium text-white hover:bg-honey-light hover:text-bee transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Loading..." : "Create Hive"}
        </button>
      </form>
    </div>
  )
}
