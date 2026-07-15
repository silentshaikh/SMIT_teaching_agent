"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import gsap from "gsap"

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(false)

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!cursorRef.current) return
      gsap.to(cursorRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: "power3.out",
      })
      if (innerRef.current) {
        gsap.set(innerRef.current, { x: e.clientX, y: e.clientY })
      }
    },
    []
  )

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove)
    return () => window.removeEventListener("mousemove", onMouseMove)
  }, [onMouseMove])

  useEffect(() => {
    const interactiveElements = document.querySelectorAll("button, a, input, textarea, select")
    const onEnter = () => setHidden(true)
    const onLeave = () => setHidden(false)

    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", onEnter)
      el.addEventListener("mouseleave", onLeave)
    })

    return () => {
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter)
        el.removeEventListener("mouseleave", onLeave)
      })
    }
  }, [])

  return (
    <div
      data-testid="cursor"
      className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300"
      data-cursor-hidden={hidden || undefined}
    >
      <div
        ref={cursorRef}
        className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/50"
      />
      <div
        ref={innerRef}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400"
      />
    </div>
  )
}
