import { useEffect, useRef } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = '#14b8a6', // teal-500
  strokeWidth = 2,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (data.length === 0) return

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const padding = strokeWidth
    const drawWidth = width - padding * 2
    const drawHeight = height - padding * 2

    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * drawWidth
      const y = height - padding - ((value - min) / range) * drawHeight
      return { x, y }
    })

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }

    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }, [data, width, height, color, strokeWidth])

  return <canvas ref={canvasRef} width={width} height={height} className="block" />
}
