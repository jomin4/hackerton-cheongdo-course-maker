import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { Spot, SpotSummary } from '@cheongdo/shared';

import { fetchJson } from '../lib/api.js';

export interface SpotDetails {
  spot: Spot;
  nearby: SpotSummary[];
}

type SpotState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: SpotDetails; error: null }
  | { status: 'error'; data: null; error: Error };

const loadingState: SpotState = { status: 'loading', data: null, error: null };

export function useSpot(): SpotState {
  const { id = '' } = useParams();
  const [result, setResult] = useState<{ id: string; state: SpotState }>({
    id: '',
    state: loadingState,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void fetchJson<SpotDetails>(`/api/spots/${encodeURIComponent(id)}`, controller.signal)
      .then((data) => {
        if (active) setResult({ id, state: { status: 'success', data, error: null } });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({
          id,
          state: {
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error('장소를 불러오지 못했어요.'),
          },
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  return result.id === id ? result.state : loadingState;
}
