"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { resetUserPassword } from "@/lib/actions/admin"

interface ResetPasswordButtonProps {
  userId: string
  email: string
}

type ModalState =
  | { kind: "closed" }
  | { kind: "confirm" }
  | { kind: "success"; tempPassword: string }
  | { kind: "error"; message: string }

export function ResetPasswordButton({ userId, email }: ResetPasswordButtonProps) {
  const [state, setState] = useState<ModalState>({ kind: "closed" })
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  function openConfirm() {
    setState({ kind: "confirm" })
  }

  function close() {
    // Closing discards the plaintext from React state — once unreachable it is
    // garbage collected. The plaintext lives in memory ONLY between the success
    // render and this close call.
    setState({ kind: "closed" })
    setCopied(false)
  }

  function handleReset() {
    startTransition(async () => {
      try {
        const { tempPassword } = await resetUserPassword(userId)
        setState({ kind: "success", tempPassword })
      } catch {
        setState({ kind: "error", message: "Reset failed. Try again." })
      }
    })
  }

  async function handleCopy(tempPassword: string) {
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openConfirm}>
        Reset password
      </Button>

      {state.kind !== "closed" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={state.kind === "success" ? undefined : close}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {state.kind === "confirm" && (
              <>
                <h2 className="mb-2 text-lg font-bold text-bee">Reset password?</h2>
                <p className="mb-6 text-sm text-stone-700">
                  Reset password for <span className="font-mono">{email}</span>? This
                  invalidates their current password immediately.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={close} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleReset}
                    disabled={isPending}
                  >
                    {isPending ? "Resetting…" : "Reset password"}
                  </Button>
                </div>
              </>
            )}

            {state.kind === "success" && (
              <>
                <h2 className="mb-2 text-lg font-bold text-bee">Password reset</h2>
                <p className="mb-2 text-sm text-stone-700">
                  Temporary password for <span className="font-mono">{email}</span>:
                </p>
                <div className="mb-3 rounded-md border border-honey bg-honey-light/30 p-3 font-mono text-lg">
                  {state.tempPassword}
                </div>
                <p className="mb-5 text-xs text-stone-600">
                  {"You'll only see this once. Share it with the user — they can change it after logging in."}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(state.tempPassword)}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="primary" size="sm" onClick={close}>
                    Done
                  </Button>
                </div>
              </>
            )}

            {state.kind === "error" && (
              <>
                <h2 className="mb-2 text-lg font-bold text-bee">Reset failed</h2>
                <p className="mb-5 text-sm text-stone-700">{state.message}</p>
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={close}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
