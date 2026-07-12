// Inline video player with custom controls (play/pause, seek, speed, volume).
// Uses a progress bar overlay instead of native controls for a consistent,
// Telegram-style look across browsers.
import { useState, useRef, useCallback, memo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

const SPEEDS = [0.5, 1, 1.5, 2];

export const VideoPlayer = memo(function VideoPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<number | null>(null);

  const speed = SPEEDS[speedIdx];
  const pct = dur ? (cur / dur) * 100 : 0;

  const showBriefly = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => setShowControls(false), 2500);
  }, []);

  const toggle = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = ref.current;
    if (!v || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * dur;
    setCur(v.currentTime);
  }, [dur]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (ref.current) ref.current.playbackRate = SPEEDS[next];
  }, [speedIdx]);

  const toggleMute = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const fullscreen = useCallback(() => {
    const v = ref.current;
    if (v?.requestFullscreen) v.requestFullscreen();
  }, []);

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn('group relative overflow-hidden rounded-lg bg-black', className)}
      onMouseMove={showBriefly}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={ref}
        src={src}
        preload="metadata"
        className="max-h-64 max-w-full"
        onClick={toggle}
        onTimeUpdate={() => setCur(ref.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          const v = ref.current;
          if (v) { setDur(v.duration || 0); v.playbackRate = speed; }
        }}
        onPlay={() => { setPlaying(true); showBriefly(); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {/* Center play/pause overlay */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <Play className="h-6 w-6 translate-x-0.5" />
          </span>
        </button>
      )}

      {/* Bottom controls bar */}
      <div className={cn(
        'absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 transition-opacity duration-200',
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}>
        <div onClick={seek} className="h-1 cursor-pointer rounded-full bg-white/30">
          <div className="h-1 rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex items-center gap-2 text-white">
          <button type="button" onClick={toggle} className="p-1 hover:opacity-80">
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <span className="text-[10px] tabular-nums">{fmt(cur)} / {fmt(dur)}</span>
          <div className="flex-1" />
          <button type="button" onClick={toggleMute} className="p-1 hover:opacity-80">
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={cycleSpeed}
            className="rounded px-1 text-[10px] font-bold tabular-nums hover:bg-white/20"
          >
            {speed}×
          </button>
          <button type="button" onClick={fullscreen} className="p-1 hover:opacity-80">
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});
