'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface Track {
  title: string
  topic: string
  src: string
}

const tracks: Track[] = [
  {
    title: 'Blue, Green, Deploy That Dream',
    topic: 'CodeDeploy — Blue/Green Deployments',
    src: '/audio/blue-green-deploy-that-dream.mp3',
  },
  {
    title: 'Blue Meets Green',
    topic: 'Route 53 — DNS Routing & Failover',
    src: '/audio/blue-meets-green-route53.mp3',
  },
  {
    title: 'Shift That Traffic',
    topic: 'Lambda — Alias Routing & Traffic Shifting',
    src: '/audio/shift-that-traffic-lambda.mp3',
  },
]

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function TrackPlayer({ track, isActive, onPlay }: {
  track: Track
  isActive: boolean
  onPlay: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)

  // Pause if another track becomes active
  useEffect(() => {
    if (!isActive && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [isActive, playing])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      onPlay()
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }, [playing, onPlay])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const audio = audioRef.current
    if (!bar || !audio || !duration) return

    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(audio.currentTime)
  }, [duration])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="group rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 dark:border-zinc-700/50 dark:bg-zinc-800/60 dark:hover:border-zinc-600">
      <audio
        ref={audioRef}
        src={track.src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        muted={muted}
      />

      <div className="flex items-center gap-4">
        {/* Play button */}
        <button
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-teal-500 text-white shadow-md transition-transform hover:scale-105 hover:bg-teal-400 active:scale-95"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" />
          )}
        </button>

        {/* Track info + progress */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {track.title}
            </h3>
            <span className="flex-none text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {track.topic}
          </p>

          {/* Progress bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="mt-2 h-1.5 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-700"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Mute button */}
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex-none text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}

export function MusicPlayer() {
  const [activeTrack, setActiveTrack] = useState<number | null>(null)

  return (
    <div className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-700/40">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Preview — 3 tracks
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Have a listen. These are short study tracks I recorded to review AWS
        concepts during workouts.
      </p>

      <div className="mt-6 space-y-3">
        {tracks.map((track, i) => (
          <TrackPlayer
            key={track.src}
            track={track}
            isActive={activeTrack === i}
            onPlay={() => setActiveTrack(i)}
          />
        ))}
      </div>
    </div>
  )
}
