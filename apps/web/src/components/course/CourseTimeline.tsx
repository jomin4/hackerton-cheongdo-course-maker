import {
  TAG_LABELS,
  ZONE_LABELS,
  toMinutes,
  type DayPlan,
  type DayPlanItem,
} from '@cheongdo/shared';
import { Link } from 'react-router';

import { Car, Check, Clock, Coffee, MapPin, Utensils } from '../ui/icons.js';
import { Chip } from '../ui/Chip.js';
import { formatDuration, formatTimeRange } from '../../lib/format.js';
import { toCourseUrl } from '../../lib/query.js';

export function CourseTimeline({ plan }: { plan: DayPlan }) {
  const courseQuery = toCourseUrl(plan.conditions).split('?')[1] ?? '';

  return (
    <section aria-labelledby="course-timeline-heading">
      <h2 className="sr-only" id="course-timeline-heading">
        방문 순서
      </h2>
      <ol className="space-y-0">
        {plan.items.map((item, index) => {
          const previousItem = plan.items[index - 1];
          return (
            <li className="flex gap-3 sm:gap-4" key={item.spot.id}>
              <div aria-hidden="true" className="flex w-9 shrink-0 flex-col items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-mono text-sm font-medium text-white">
                  {item.type === 'visit' ? (
                    String(item.order).padStart(2, '0')
                  ) : item.type === 'meal' ? (
                    <Utensils className="h-4 w-4" />
                  ) : (
                    <Coffee className="h-4 w-4" />
                  )}
                </span>
                {index < plan.items.length - 1 && (
                  <span className="mt-2 w-px flex-1 bg-line-strong" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-7">
                {previousItem ? (
                  <TravelRow item={item} />
                ) : (
                  item.waitMinutes > 0 && (
                    <p className="flex min-h-11 items-center gap-2 pl-1 text-sm text-muted">
                      <Clock aria-hidden="true" className="h-4 w-4 shrink-0" />
                      여는 시간까지 여유 {formatDuration(item.waitMinutes)}
                    </p>
                  )
                )}
                <PlanCard courseQuery={courseQuery} item={item} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TravelRow({ item }: { item: DayPlanItem }) {
  return (
    <p className="flex min-h-11 items-center gap-2 pl-1 text-xs text-muted sm:text-sm">
      <Car aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">
        차로 약 {item.travelMinutes}분 · {item.distanceKm.toFixed(1)}km
        {item.waitMinutes > 0 && ` · 여유 ${formatDuration(item.waitMinutes)}`}
      </span>
    </p>
  );
}

function PlanCard({ courseQuery, item }: { courseQuery: string; item: DayPlanItem }) {
  const kindLabel =
    item.type === 'visit'
      ? '관광'
      : item.type === 'rest'
        ? '쉬어 가기'
        : item.meal === 'lunch'
          ? '점심'
          : '저녁';
  const duration = toMinutes(item.leaveAt) - toMinutes(item.arriveAt);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface">
      {item.spot.image && (
        <figure>
          <img
            alt={item.spot.image.alt}
            className="aspect-video w-full object-cover"
            loading="lazy"
            src={item.spot.image.url}
          />
          <figcaption className="px-4 pt-2 text-xs leading-5 text-muted sm:px-5">
            {item.spot.image.credit}
          </figcaption>
        </figure>
      )}
      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Chip className="bg-ink text-white">{kindLabel}</Chip>
              <Chip className="bg-fill">
                <MapPin aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                {ZONE_LABELS[item.spot.zone]}
              </Chip>
            </div>
            <h3 className="mt-3 break-words text-lg font-semibold tracking-tight">
              {item.spot.name}
            </h3>
          </div>
          <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-mono text-sm text-ink-3">
            <Clock aria-hidden="true" className="h-4 w-4" />
            {formatTimeRange(item.arriveAt, item.leaveAt)}
          </span>
        </div>

        <p className="mt-3 break-words text-sm leading-6 text-ink-2">{item.spot.summary}</p>

        {item.type === 'visit' && item.matchedTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.matchedTags.map((tag) => (
              <span
                className="inline-flex min-h-7 items-center gap-1 rounded-md bg-accent-soft px-2 text-xs font-medium text-accent-text"
                key={tag}
              >
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
          <span className="text-xs text-muted">
            {item.type === 'visit' ? `체류 ${formatDuration(duration)}` : kindLabel}
          </span>
          <Link
            className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent-text"
            to={`/spots/${item.spot.id}?from=${encodeURIComponent(courseQuery)}`}
          >
            상세 보기
          </Link>
        </div>
      </div>
    </article>
  );
}
