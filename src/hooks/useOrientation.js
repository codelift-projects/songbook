import { useEffect, useState } from 'react';

function read() {
  if (typeof window === 'undefined') return 'landscape';
  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
}

export function useOrientation() {
  const [o, setO] = useState(read);
  useEffect(() => {
    const update = () => setO(read());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mq.removeEventListener?.('change', update);
    };
  }, []);
  return o;
}
