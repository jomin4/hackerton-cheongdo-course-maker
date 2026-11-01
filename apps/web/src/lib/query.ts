import {
  COMPANIONS,
  DAY_LIMITS,
  TAGS,
  isValidDate,
  toClock,
  toMinutes,
  type DayQuery,
  type Tag,
} from '@cheongdo/shared';

export function sortTags(tags: readonly Tag[]): Tag[] {
  return TAGS.filter((tag) => tags.includes(tag));
}

export const START_OPTIONS = (() => {
  const options: string[] = [];
  const start = toMinutes(DAY_LIMITS.startMin);
  const end = toMinutes(DAY_LIMITS.startMax);

  for (let minute = start; minute <= end; minute += DAY_LIMITS.stepMinutes) {
    options.push(toClock(minute));
  }

  return options;
})();

export function endOptions(start: string): string[] {
  const options: string[] = [];
  const firstEnd = toMinutes(start) + DAY_LIMITS.minSpanMinutes;
  const lastEnd = toMinutes(DAY_LIMITS.endMax);

  for (let minute = firstEnd; minute <= lastEnd; minute += DAY_LIMITS.stepMinutes) {
    options.push(toClock(minute));
  }

  return options;
}

export function defaultDayQuery(today: string): DayQuery {
  return {
    date: today,
    start: '10:00',
    end: '19:00',
    with: 'family',
    tags: ['nature', 'experience'],
    exclude: [],
  };
}

export function fromDaySearchParams(params: URLSearchParams, today: string): DayQuery {
  const defaults = defaultDayQuery(today);
  const rawDate = params.get('date') ?? '';
  const date = isValidDate(rawDate) && rawDate >= today ? rawDate : today;
  const rawStart = params.get('start');
  const start = START_OPTIONS.find((option) => option === rawStart) ?? defaults.start;
  const availableEnds = endOptions(start);
  const rawEnd = params.get('end');
  const end =
    availableEnds.find((option) => option === rawEnd) ??
    (rawEnd === null && availableEnds.includes(defaults.end)
      ? defaults.end
      : (availableEnds[0] ?? defaults.end));
  const rawCompanion = params.get('with');
  const companion = COMPANIONS.find((value) => value === rawCompanion);
  const tags = sortTags(
    (params.get('tags') ?? '')
      .split(',')
      .filter((value): value is Tag => TAGS.some((tag) => tag === value)),
  );

  return {
    date,
    start,
    end,
    with: companion ?? defaults.with,
    tags: params.has('tags') ? tags : [...defaults.tags],
    exclude: [],
  };
}

export function toCourseUrl(query: DayQuery): string {
  const tags = sortTags(query.tags).join(',');
  const exclude = query.exclude.length > 0 ? `&exclude=${query.exclude.join(',')}` : '';
  return `/course?date=${query.date}&start=${query.start}&end=${query.end}&with=${query.with}&tags=${tags}${exclude}`;
}
