'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw, FastForward } from 'lucide-react';
import { formatSecondsToTime } from '@/lib/utils';

interface AudioPlayerProps {
  callAttemptId: string;
  durationSeconds?: number;
}

export function AudioPlayer({ callAttemptId, durationSeconds = 0 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('dayaar_access_token') : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const audioSrc = `${apiUrl}/calls/${callAttemptId}/recording`;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-xs w-full max-w-sm">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-700 text-white hover:bg-sky-800 transition-colors flex-shrink-0 shadow-sm"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>{formatSecondsToTime(Math.floor(currentTime))}</span>
          <span>{formatSecondsToTime(Math.floor(duration || durationSeconds))}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || durationSeconds || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-700"
        />
      </div>

      <button
        type="button"
        onClick={cyclePlaybackRate}
        className="px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-xs font-bold font-mono hover:bg-slate-100 flex-shrink-0"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
