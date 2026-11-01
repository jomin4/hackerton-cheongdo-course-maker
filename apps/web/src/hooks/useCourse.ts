import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { DayPlan } from '@cheongdo/shared';

import { fetchJson } from '../lib/api.js';

export type CourseState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: DayPlan; error: null }
  | { status: 'error'; data: null; error: Error };

const loadingState: CourseState = { status: 'loading', data: null, error: null };

export function useCourse(searchOverride?: string, enabled = true, retryCount = 0): CourseState {
  const location = useLocation();
  const search = searchOverride ?? location.search;
  const [result, setResult] = useState<{
    search: string;
    retryCount: number;
    state: CourseState;
  }>({
    search: '',
    retryCount: -1,
    state: loadingState,
  });

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let active = true;

    void fetchJson<DayPlan>(`/api/course${search}`, controller.signal)
      .then((data) => {
        if (active)
          setResult({
            search,
            retryCount,
            state: { status: 'success', data, error: null },
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({
          search,
          retryCount,
          state: {
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error('코스를 불러오지 못했어요.'),
          },
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, retryCount, search]);

  return enabled && result.search === search && result.retryCount === retryCount
    ? result.state
    : loadingState;
}
