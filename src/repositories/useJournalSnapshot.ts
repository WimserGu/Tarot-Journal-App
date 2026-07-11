import { useEffect, useState } from 'react';

import { journalStore, type JournalStore } from './mockJournalStore';
import type { JournalData } from './journalData';

export function useJournalSnapshot(store: JournalStore = journalStore): JournalData {
  const [data, setData] = useState<JournalData>(() => store.snapshot());

  useEffect(() => {
    setData(store.snapshot());

    return store.subscribe(() => {
      setData({ ...store.snapshot() });
    });
  }, [store]);

  return data;
}
