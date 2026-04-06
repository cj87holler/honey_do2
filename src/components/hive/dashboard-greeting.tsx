"use client"

import { useState } from "react"

interface DashboardGreetingProps {
  name: string
  activeTaskCount: number
}

const COPY_REGISTRY = {
  zero: [
    "Hey {name}, your Honeycomb is empty. Go play golf — you've earned it! 🏌️",
    "Hey {name}, nothing in your Honeycomb. The hive is at peace. 🌻",
    "Hey {name}, all done! The bees are impressed. Seriously. 🐝",
    "Hey {name}, zero tasks. Absolute legend. The Queen approves. 👑",
    "Hey {name}, your Honeycomb is sparkling clean. Take the afternoon off. ✨",
    "Hey {name}, nothing to buzz about today. Rest those wings. 🍯",
    "Hey {name}, task-free zone! You're the worker bee everyone aspires to be. 🏆",
    "Hey {name}, empty Honeycomb energy. Rare. Powerful. Beautiful. 🌟",
  ],
  light: [
    "Hey {name}, just a few honey drops to collect. You've got this. 🍯",
    "Hey {name}, {count} little tasks. A warm-up for a champion. 💪",
    "Hey {name}, {count} tasks on your Honeycomb. Light work for a busy bee. 🐝",
    "Hey {name}, {count} tasks buzzing your way. Knock 'em out! ⚡",
    "Hey {name}, a light load today. Perfect time to be speedy. 🚀",
    "Hey {name}, {count} tasks. The hive believes in you. So do we. 🌼",
    "Hey {name}, just {count} things between you and sweet freedom. 🍋",
    "Hey {name}, easy day! {count} tasks and then you're free as a bee. 🌈",
  ],
  moderate: [
    "Hey {name}, {count} tasks buzzing! Time to put on your work stripes. 🐝",
    "Hey {name}, the Honeycomb is filling up. Let's get to it! 🏃",
    "Hey {name}, {count} tasks in the hive. Full bee mode activated. ⚡",
    "Hey {name}, {count} honeys waiting to be earned. Buzz buzz! 🍯",
    "Hey {name}, mid-hive hustle mode. {count} tasks, let's gooo. 🔥",
    "Hey {name}, {count} tasks on deck. This is what being a bee is about. 💛",
    "Hey {name}, solid task load! {count} things between you and honey glory. 🏆",
    "Hey {name}, {count} tasks. The Queen has high expectations. Don't disappoint. 👑",
  ],
  heavy: [
    "Hey {name}, whoa! {count} tasks buzzing — your Honeycomb is PACKED! 🚨",
    "Hey {name}, {count} tasks?! You're basically the whole hive. Let's go! 💥",
    "Hey {name}, {count} tasks and counting. Hero mode: engaged. 🦸",
    "Hey {name}, buzz buzz BUZZ! {count} tasks need your wings. Fly! 🐝🐝🐝",
    "Hey {name}, the Honeycomb overflows! {count} tasks await. You can do this. 💪",
    "Hey {name}, {count} tasks. Legend. Absolute legend. The bees sing your name. 🎶",
    "Hey {name}, full hive alert! {count} tasks. Sting 'em one by one. 🎯",
    "Hey {name}, {count} tasks! The Queen is watching. Don't keep her waiting. 👑🔥",
  ],
}

function getLoadState(count: number): "zero" | "light" | "moderate" | "heavy" {
  if (count === 0) return "zero"
  if (count <= 3) return "light"
  if (count <= 7) return "moderate"
  return "heavy"
}

export function DashboardGreeting({ name, activeTaskCount }: DashboardGreetingProps) {
  const [variantIndex] = useState(() => Math.floor(Math.random() * 8))

  const loadState = getLoadState(activeTaskCount)
  const template = COPY_REGISTRY[loadState][variantIndex]
  const message = template
    .replace("{name}", name)
    .replace("{count}", String(activeTaskCount))

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 sm:px-6 sm:py-4">
      <p className="text-xl sm:text-2xl font-bold text-bee">{message}</p>
    </div>
  )
}
