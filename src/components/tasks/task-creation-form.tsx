"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { HoneyPicker } from "./honey-picker"
import { createTask } from "@/lib/actions/task"

const createTaskSchema = z.object({
  text: z.string().min(1, "Task text is required.").max(160, "Maximum 160 characters."),
  honeyValue: z.number().int().min(1).max(100),
  assigneeId: z.string().min(1, "Assign this task to someone."),
})

type CreateTaskFormValues = z.infer<typeof createTaskSchema>

interface TaskCreationFormProps {
  hiveId: string
  members: { id: string; name: string }[]
}

export function TaskCreationForm({ hiveId, members }: TaskCreationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      text: "",
      honeyValue: 10,
      assigneeId: "",
    },
  })

  const watchedText = watch("text") ?? ""
  const charCount = watchedText.length

  function getCounterColor() {
    if (charCount >= 140) return "text-red-600"
    if (charCount >= 120) return "text-amber-600"
    return "text-stone-400"
  }

  async function onSubmit(data: CreateTaskFormValues) {
    const formData = new FormData()
    formData.set("text", data.text)
    formData.set("honeyValue", String(data.honeyValue))
    formData.set("assigneeId", data.assigneeId)
    await createTask(hiveId, formData)
    reset()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-4"
    >
      <h2 className="text-base font-semibold text-bee">Assign a Task</h2>

      <div className="space-y-1">
        <div className="relative">
          <textarea
            {...register("text")}
            placeholder="What needs to get done? (e.g. Do the dishes)"
            maxLength={160}
            rows={2}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-bee placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-honey-light resize-none"
          />
          <span className={`absolute bottom-2 right-3 text-xs ${getCounterColor()}`}>
            {charCount}/160
          </span>
        </div>
        {errors.text && (
          <p className="text-xs text-red-600">{errors.text.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-stone-600">Assign to</label>
        <select
          {...register("assigneeId")}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-bee focus:outline-none focus:ring-2 focus:ring-honey-light"
        >
          <option value="">Select a housemate...</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {errors.assigneeId && (
          <p className="text-xs text-red-600">{errors.assigneeId.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-stone-600">Honey value</label>
        <Controller
          name="honeyValue"
          control={control}
          render={({ field }) => (
            <HoneyPicker value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.honeyValue && (
          <p className="text-xs text-red-600">{errors.honeyValue.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Assigning..." : "Assign Task"}
      </Button>
    </form>
  )
}
