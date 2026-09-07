import { useCallback, useEffect, useRef, useState } from "react";
import type { Run } from "../engine/algorithms";
export interface Clock {
  position: number;
  playing: boolean;
}
export function usePlayback(runs: Run[]) {
  const clock = useRef<Clock>({ position: 0, playing: false });
  const [tick, setTick] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const autoPlay = useRef(false),
    lastUI = useRef(-1);
  const max = Math.max(0, ...runs.map((r) => r.history.length - 1));
  const sync = useCallback(() => {
    setTick((t) => t + 1);
    setPlaying(clock.current.playing);
  }, []);
  useEffect(() => {
    clock.current = { position: 0, playing: autoPlay.current && max > 0 };
    autoPlay.current = false;
    lastUI.current = -1;
    sync();
  }, [runs, max, sync]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      last = 0;
    const animate = (now: number) => {
      if (!clock.current.playing) return;
      if (last)
        clock.current.position = Math.min(
          max,
          clock.current.position + (Math.min(now - last, 80) * speed) / 1400,
        );
      last = now;
      const stage = Math.floor(clock.current.position * 6);
      if (stage !== lastUI.current) {
        lastUI.current = stage;
        setTick((t) => t + 1);
      }
      if (clock.current.position >= max) {
        clock.current.playing = false;
        sync();
        return;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, max, sync]);
  const toggle = useCallback(() => {
    if (max === 0) return;
    if (clock.current.position >= max) clock.current.position = 0;
    clock.current.playing = !clock.current.playing;
    sync();
  }, [max, sync]);
  const seek = useCallback(
    (value: number) => {
      clock.current = {
        position: Math.max(0, Math.min(max, value)),
        playing: false,
      };
      sync();
    },
    [max, sync],
  );
  const reset = useCallback(() => seek(0), [seek]);
  const next = useCallback(
    () => seek(Math.floor(clock.current.position + 1e-8) + 1),
    [seek],
  );
  const previous = useCallback(
    () => seek(Math.ceil(clock.current.position - 1e-8) - 1),
    [seek],
  );
  const replayOnChange = useCallback(() => {
    autoPlay.current = true;
  }, []);
  return {
    clock,
    tick,
    playing,
    speed,
    setSpeed,
    toggle,
    seek,
    reset,
    next,
    previous,
    replayOnChange,
    max,
    index: Math.floor(clock.current.position + 1e-8),
    phase: Math.min(5, Math.floor((clock.current.position % 1) * 6)),
  };
}
