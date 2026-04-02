// @vitest-environment happy-dom
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/actions/task", () => ({
  updateTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}))

import { Honeycomb } from "@/components/tasks/honeycomb"

const baseTask = {
  id: "task-1",
  text: "Do the dishes",
  honeyValue: 10,
  status: "open" as const,
  assigneeId: "member-1",
  assigneeName: "Alice",
  createdBy: "user-1",
  createdAt: new Date(),
  completedAt: null,
}

const myTask = { ...baseTask, id: "task-1", text: "Do the dishes", assigneeId: "member-1" }

const otherTask = {
  ...baseTask,
  id: "task-2",
  text: "Take out the trash",
  assigneeId: "member-2",
  assigneeName: "Bob",
}

const completedTask = {
  ...baseTask,
  id: "task-3",
  text: "Vacuum the living room",
  status: "done" as const,
  assigneeId: "member-1",
  completedAt: new Date(),
}

describe("Honeycomb", () => {
  it("renders tasks assigned to current member", () => {
    render(
      <Honeycomb
        tasks={[myTask, otherTask]}
        currentMemberId="member-1"
        isQueen={false}
        hiveId="hive-1"
      />
    )

    expect(screen.queryByText("Do the dishes")).not.toBeNull()
    expect(screen.queryByText("Take out the trash")).toBeNull()
  })

  it("shows empty state when no tasks assigned", () => {
    render(
      <Honeycomb
        tasks={[otherTask]}
        currentMemberId="member-1"
        isQueen={false}
        hiveId="hive-1"
      />
    )

    const emptyEl = screen.queryByText(/No tasks/i)
    expect(emptyEl).not.toBeNull()
  })

  it("shows completed tasks in separate section with count badge", () => {
    render(
      <Honeycomb
        tasks={[myTask, completedTask]}
        currentMemberId="member-1"
        isQueen={false}
        hiveId="hive-1"
      />
    )

    expect(screen.queryByText("Do the dishes")).not.toBeNull()
    const completedBtn = screen.queryByText(/Completed \(1\)/i)
    expect(completedBtn).not.toBeNull()
  })

  it("completed section is collapsed by default — completed task text not visible", () => {
    render(
      <Honeycomb
        tasks={[myTask, completedTask]}
        currentMemberId="member-1"
        isQueen={false}
        hiveId="hive-1"
      />
    )

    expect(screen.queryByText("Vacuum the living room")).toBeNull()
  })

  it("expands completed section on click", () => {
    render(
      <Honeycomb
        tasks={[myTask, completedTask]}
        currentMemberId="member-1"
        isQueen={false}
        hiveId="hive-1"
      />
    )

    const completedButton = screen.getByText(/Completed \(1\)/i)
    fireEvent.click(completedButton)

    expect(screen.queryByText("Vacuum the living room")).not.toBeNull()
  })
})
