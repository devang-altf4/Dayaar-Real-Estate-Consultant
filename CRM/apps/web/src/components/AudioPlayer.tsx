'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { formatSecondsToTime } from '@/lib/utils';

interface AudioPlayerProps {
  callAttemptId: string;
  durationSeconds?: number;
}

export function AudioPlayer({ callAttemptId, durationSeconds = 0 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState('');

  const ensureAudioUrl = async () => {
    if (audioUrl) return audioUrl;
    const result = await api.get<{ url: string | null; streamPath: string | null }>(
      `/calls/${callAttemptId}/recording-url`,
    );
    // A signed URL is already authorised. The stream route is not, and an
    // <audio> element cannot attach a bearer token, so pull it as a blob.
    if (result.url) {
      setAudioUrl(result.url);
      return result.url;
    }
    if (!result.streamPath) throw new Error('Recording is unavailable.');
    const blob = await api.getBlob(result.streamPath);
    const objectUrl = URL.createObjectURL(blob);
    setAudioUrl(objectUrl);
    return objectUrl;
  };

  useEffect(
    () => () => {
      if (audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  const togglePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const url = await ensureAudioUrl();
      if (!audioRef.current) return;
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
      await audioRef.current.play();
    } catch (err: any) {
      setError(err.message || 'Recording is unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(event.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 p-2 bg-slate-50/80 border border-slate-200/80 rounded-xl shadow-subtle w-full max-w-sm">
        <audio
          ref={audioRef}
          onTimeUpdate={() => {
            if (!audioRef.current) return;
            setCurrentTime(audioRef.current.currentTime);
            if (Number.isFinite(audioRef.current.duration)) setDuration(audioRef.current.duration);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          preload="none"
        />
        <button
          type="button"
          disabled={isLoading}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white disabled:bg-slate-300 flex-shrink-0 shadow-xs transition-all cursor-pointer"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-500">
            <span>{formatSecondsToTime(Math.floor(currentTime))}</span>
            <span>{formatSecondsToTime(Math.floor(duration || durationSeconds))}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || durationSeconds || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
        </div>
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[11px] font-bold font-mono hover:bg-slate-100 transition-colors shadow-subtle cursor-pointer"
        >
          {playbackRate}x
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
