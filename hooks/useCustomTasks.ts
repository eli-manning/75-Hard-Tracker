import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { CustomTask } from '../lib/types';

export function useCustomTasks(uid: string | null) {
  const [tasks, setTasks] = useState<CustomTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(getFirebaseDb(), 'customTasks', uid, 'tasks'),
      orderBy('order', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => d.data() as CustomTask));
      setLoading(false);
    }, (err) => {
      if (err.code !== 'permission-denied') console.error(err);
    });

    return unsub;
  }, [uid]);

  return { tasks, loading };
}
