import { toMinutes, type DayPlan } from '@cheongdo/shared';

import { formatDuration, formatTimeRange } from '../../lib/format.js';

export function CourseSummary({ plan }: { plan: DayPlan }) {
  const { stayMinutes, travelMinutes, slackMinutes, startAt, endAt, visitCount } = plan.totals;
  const selectedMinutes = toMinutes(plan.conditions.end) - toMinutes(plan.conditions.start);
  const mealCount = plan.items.filter((item) => item.type === 'meal').length;
  const barWidth = (minutes: number) =>
    selectedMinutes > 0 ? `${(minutes / selectedMinutes) * 100}%` : '0%';

  return (
    <section
      aria-labelledby="course-summary-heading"
      className="min-w-0 rounded-card border border-line bg-surface p-5"
    >
      <h2 className="text-sm font-semibold" id="course-summary-heading">
        일정 요약
      </h2>
      <p className="mt-4 break-words font-mono text-3xl font-semibold tracking-tight">
        {formatTimeRange(startAt, endAt)}
      </p>
      <p className="mt-1 text-sm text-muted">
        선택한 시간 {formatTimeRange(plan.conditions.start, plan.conditions.end)}
      </p>

      <div
        aria-label={`체류 ${formatDuration(stayMinutes)}, 이동 ${formatDuration(travelMinutes)}, 여유 ${formatDuration(slackMinutes)}`}
        className="mt-6 flex h-3 overflow-hidden rounded-full bg-fill"
        role="img"
      >
        <div className="h-full bg-ink" style={{ width: barWidth(stayMinutes) }} />
        <div className="h-full bg-accent" style={{ width: barWidth(travelMinutes) }} />
        <div className="h-full bg-line-strong" style={{ width: barWidth(slackMinutes) }} />
      </div>
      <ul className="mt-4 grid gap-2 text-xs text-ink-3">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-ink" />
          체류 {formatDuration(stayMinutes)}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-accent" />
          이동 {formatDuration(travelMinutes)}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-line-strong" />
          여유 {formatDuration(slackMinutes)}
        </li>
      </ul>

      <div className="mt-6 border-t border-line-soft pt-4 text-sm">
        <p>관광 {visitCount}곳</p>
        <p className="mt-2">{mealCount > 0 ? `식사 ${mealCount}번` : '식사 없음'}</p>
      </div>
    </section>
  );
}
