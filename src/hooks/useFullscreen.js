import { useCallback, useEffect, useState } from 'react';

export function useFullscreen(target) {
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' && !!document.fullscreenElement
  );

  useEffect(() => {
    const el = target?.current || document.documentElement;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      void el;
    };
  }, [target]);

  const enter = useCallback(async () => {
    const el = target?.current || document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    try { await fn?.call(el, { navigationUI: 'hide' }); } catch {}
  }, [target]);

  const exit = useCallback(async () => {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    try { await fn?.call(document); } catch {}
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) exit(); else enter();
  }, [enter, exit]);

  return { isFullscreen, enter, exit, toggle };
}
