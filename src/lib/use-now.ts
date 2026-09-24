import { useEffect, useState } from 'react';

/** The current time, re-read on the given interval so countdowns tick without a reload. */
export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};
