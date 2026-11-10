import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceRevFrame, isRevShortcut } from './rev.js';
export default function useRev({ running, helpOpen, state, setState }) {
  const latest = useRef(state), sources = useRef(new Set());
  const motion = useRef(null);
  const [revving, setRevving] = useState(false);
  latest.current = state;
  const begin = useCallback(source => {
    sources.current.add(source); setRevving(true);
  }, []);
  const end = useCallback(source => {
    sources.current.delete(source);
    if (!sources.current.size) setRevving(false);
  }, []);
  const releaseAll = useCallback(() => { sources.current.clear(); setRevving(false); }, []);
  useEffect(() => {
    if (!running || helpOpen) { releaseAll(); return; }
    const down = e => {
      if (!isRevShortcut(e, running, helpOpen)) return;
      // Capture before buttons/sliders can activate, scroll, or consume Space.
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) begin('keyboard');
    };
    const up = e => {
      if (e.code !== 'Space' || !sources.current.has('keyboard')) return;
      e.preventDefault(); e.stopPropagation(); end('keyboard');
    };
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up, true);
    window.addEventListener('blur', releaseAll);
    let lastTick = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), seconds = Math.min((now - lastTick) / 1000, 0.05);
      lastTick = now;
      const current = latest.current;
      const next = advanceRevFrame(current, motion.current, sources.current.size > 0, seconds);
      motion.current = next.motion;
      if (next.rpm !== current.rpm) {
        setState(s => s.rpm === current.rpm && s.baseRpm === current.baseRpm ? { ...s, rpm: next.rpm } : s);
      }
    }, 20);
    return () => { clearInterval(timer); window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', releaseAll); };
  }, [running, helpOpen, begin, end, releaseAll, setState]);
  return { revving, begin, end, resetMotion: () => { motion.current = null; } };
}
