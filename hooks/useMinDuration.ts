import { useEffect, useState } from 'react';

export function useMinDuration(loading: boolean, minMs = 1000): boolean {
  const [visible, setVisible] = useState(loading);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), minMs);
    return () => clearTimeout(t);
  }, [loading, minMs]);

  return visible;
}
