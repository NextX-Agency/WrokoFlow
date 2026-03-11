import confetti from "canvas-confetti"

type ConfettiPreset = "default" | "fireworks" | "stars" | "side-cannons"

/**
 * Fire confetti with a preset animation.
 * Respects the enable_confetti setting when used with project settings.
 */
export function fireConfetti(preset: ConfettiPreset = "default"): void {
  switch (preset) {
    case "fireworks":
      fireFireworks()
      break
    case "stars":
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.6 },
        shapes: ["star"],
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"],
      })
      break
    case "side-cannons":
      fireSideCannons()
      break
    default:
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
  }
}

function fireFireworks(): void {
  const duration = 1500
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#3b82f6", "#10b981", "#f59e0b"],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#8b5cf6", "#ec4899", "#ef4444"],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

function fireSideCannons(): void {
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.65 },
  })
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.65 },
  })
}

/**
 * Subtle celebration for smaller wins (e.g., all tasks in a column completed).
 */
export function fireSubtleConfetti(): void {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    gravity: 1.2,
    scalar: 0.8,
    ticks: 100,
    colors: ["#3b82f6", "#93c5fd"],
  })
}
