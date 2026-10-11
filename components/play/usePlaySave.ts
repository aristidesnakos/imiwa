'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SAVE, readPlaySave, writePlaySave, type PlaySave } from './save';

/**
 * Tan Dash's stored progress, in CLAUDE.md's hook pattern: the first render is
 * the SSR-safe DEFAULT_SAVE on server and client alike, and the stored value
 * arrives in an effect. Nothing downstream needs a `mounted` guard.
 *
 * `saveRef` is the same value for code that runs outside React's render (the
 * engine's hooks), so a catch never reads a stale Kanji-dex.
 *
 * Writes go to storage only when what was read was nothing or something
 * recognised; an unrecognised blob is never written over (./save.ts).
 */
export function usePlaySave() {
  const [save, setSave] = useState<PlaySave>(DEFAULT_SAVE);
  const saveRef = useRef<PlaySave>(DEFAULT_SAVE);
  const writable = useRef(false);

  useEffect(() => {
    const read = readPlaySave();
    if (read.kind === 'ok') {
      saveRef.current = read.save;
      setSave(read.save);
    }
    writable.current = read.kind !== 'unknown';
  }, []);

  // eslint-disable-next-line no-unused-vars -- the base rule reports a parameter name in a function type
  const update = useCallback((fn: (prev: PlaySave) => PlaySave) => {
    const next = fn(saveRef.current);
    saveRef.current = next;
    setSave(next);
    if (writable.current && !writePlaySave(next)) {
      // Storage refused, or another tab left something unrecognised: stop
      // writing for this page view rather than retrying over it.
      writable.current = false;
    }
  }, []);

  return { save, saveRef, update };
}
