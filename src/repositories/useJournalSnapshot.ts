import { useEffect, useState } from 'react';

import { mockJournalStore, type MockJournalStore } from './mockJournalStore';
import type { JournalData } from './journalData';

export function useJournalSnapshot(store: MockJournalStore = mockJournalStore): JournalData {
  const [data, setData] = useState<JournalData>(() => store.snapshot());

  useEffect(() => {
    setData(store.snapshot());

    return store.subscribe(() => {
      setData({ ...store.snapshot() });
    });
  }, [store]);

  return data;
}
