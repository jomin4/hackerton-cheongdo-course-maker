import type { DayPlan } from '@cheongdo/shared';
import { Link } from 'react-router';

import { toCourseUrl } from '../../lib/query.js';

export function ExcludedSpots({ plan }: { plan: DayPlan }) {
  if (plan.excluded.length === 0) return null;

  const canExtend = plan.excluded.some(({ reason }) => reason === 'NOT_ENOUGH_TIME');

  return (
    <section
      aria-labelledby="excluded-spots-heading"
      className="min-w-0 rounded-card border border-line bg-surface p-5"
    >
      <h2 className="text-sm font-semibold" id="excluded-spots-heading">
        이번 일정에서 빠진 장소
      </h2>
      <ul className="mt-3 divide-y divide-line-soft">
        {plan.excluded.map(({ spot, reason }) => (
          <li
            className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm"
            key={spot.id}
          >
            <span className="min-w-0 break-words">{spot.name}</span>
            <span className="shrink-0 rounded-md bg-fill px-2 py-1 text-xs text-ink-3">
              {reason === 'CLOSED_ON_DAY' ? '이날 휴무' : '시간 부족'}
            </span>
          </li>
        ))}
      </ul>
      {canExtend && plan.conditions.end < '21:00' && (
        <Link
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent-text underline underline-offset-4"
          to={toCourseUrl({ ...plan.conditions, end: '21:00' })}
        >
          끝 시각을 21:00으로 늦춰 다시 만들기
        </Link>
      )}
    </section>
  );
}
