'use client';

import { useEffect, useState } from 'react';

/** true when browser tab is visible — used to pause polling in background. */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => {
      setVisible(document.visibilityState === 'visible');
    };
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

/**
 * Returns refetchInterval only while tab is visible; false when hidden.
 * @param ms interval when visible
 */
export function useVisibleRefetchInterval(ms: number): number | false {
  const visible = useDocumentVisible();
  return visible ? ms : false;
}
