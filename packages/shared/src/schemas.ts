import { z } from 'zod';
import { COMPANIONS, DAY_LIMITS, KINDS, MEALS, TAGS, WEEKDAYS, ZONES } from './constants.js';
import { isValidDate, toMinutes } from './time.js';
import type { DayQuery } from './types.js';

export function splitCsv(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

const isClock = (value: string): boolean => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

const timeRangeSchema = z
  .object({
    open: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  })
  .superRefine((range, context) => {
    if (toMinutes(range.open) >= toMinutes(range.close)) {
      context.addIssue({
        code: 'custom',
        message: '영업 시작 시각은 종료 시각보다 빨라야 해요.',
        path: ['close'],
      });
    }
  });

const weeklyHoursSchema = z.object({
  days: z.record(z.enum(WEEKDAYS), z.array(timeRangeSchema)),
  lastEntryBeforeCloseMinutes: z.number().int().min(0).max(120).optional(),
  note: z.string().optional(),
});

export const spotSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    kind: z.enum(KINDS),
    name: z.string().min(1),
    summary: z.string().min(1).max(80),
    description: z.array(z.string().min(1)).min(1),
    tips: z.array(z.string().min(1)),
    zone: z.enum(ZONES),
    location: z.object({
      lat: z.number().min(35.5).max(35.8),
      lng: z.number().min(128.5).max(129.1),
    }),
    tags: z.array(z.enum(TAGS)),
    goodFor: z.array(z.enum(COMPANIONS)).min(1),
    stayMinutes: z.number().int().min(10).max(240),
    meals: z.array(z.enum(MEALS)).optional(),
    address: z.string().min(1),
    hours: weeklyHoursSchema,
    fee: z.string().optional(),
    phone: z.string().optional(),
    images: z.array(
      z.object({
        url: z
          .string()
          .url()
          .refine((url) => url.startsWith('https://')),
        alt: z.string().min(1),
        license: z.literal('kogl-1'),
        credit: z.string().min(1),
      }),
    ),
    source: z.string().min(1),
    sourceRef: z
      .object({
        provider: z.literal('tourapi'),
        contentId: z.string().regex(/^\d+$/),
      })
      .optional(),
    checkedAt: z.string().refine(isValidDate, {
      message: '확인 날짜가 올바르지 않아요.',
    }),
  })
  .superRefine((spot, context) => {
    if (spot.kind === 'spot' && spot.tags.length === 0) {
      context.addIssue({
        code: 'custom',
        message: '관광지는 관심사를 하나 이상 골라야 해요.',
        path: ['tags'],
      });
    }

    if (spot.kind === 'restaurant' && (!spot.meals || spot.meals.length === 0)) {
      context.addIssue({
        code: 'custom',
        message: '식당은 식사 종류를 하나 이상 골라야 해요.',
        path: ['meals'],
      });
    }

    if (spot.kind !== 'restaurant' && spot.meals !== undefined) {
      context.addIssue({
        code: 'custom',
        message: '식당이 아니면 식사 종류를 지정할 수 없어요.',
        path: ['meals'],
      });
    }

    for (const weekday of WEEKDAYS) {
      const ranges = spot.hours.days[weekday];
      for (let index = 0; index < ranges.length; index += 1) {
        const range = ranges[index];
        if (!range || !isClock(range.open) || !isClock(range.close)) {
          continue;
        }

        const previousRange = ranges[index - 1];
        if (
          previousRange &&
          isClock(previousRange.open) &&
          toMinutes(previousRange.open) > toMinutes(range.open)
        ) {
          context.addIssue({
            code: 'custom',
            message: '같은 요일의 영업시간은 이른 시간부터 적어야 해요.',
            path: ['hours', 'days', weekday, index, 'open'],
          });
        }

        for (let otherIndex = index + 1; otherIndex < ranges.length; otherIndex += 1) {
          const otherRange = ranges[otherIndex];
          if (
            otherRange &&
            isClock(otherRange.open) &&
            isClock(otherRange.close) &&
            toMinutes(range.open) < toMinutes(otherRange.close) &&
            toMinutes(otherRange.open) < toMinutes(range.close)
          ) {
            context.addIssue({
              code: 'custom',
              message: '같은 요일의 영업시간은 겹칠 수 없어요.',
              path: ['hours', 'days', weekday, otherIndex, 'open'],
            });
          }
        }
      }
    }
  });

export const spotsFileSchema = z
  .array(spotSchema)
  .refine((spots) => new Set(spots.map((spot) => spot.id)).size === spots.length, {
    message: 'spot id가 중복되었습니다',
  });

const DATE_MESSAGE = '방문 날짜가 올바르지 않아요.';
const START_MESSAGE = '시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.';
const END_MESSAGE = '끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.';
const COMPANION_MESSAGE = '동행은 solo, couple, family, friends 중 하나여야 해요.';
const TAG_MESSAGE = '관심사는 nature, history, experience, food, photo 중에서 골라주세요.';
const EMPTY_TAGS_MESSAGE = '관심사를 하나 이상 골라주세요.';
const EXCLUDE_MESSAGE = '제외할 장소 값이 올바르지 않아요.';

const isDayStart = (value: string): boolean => {
  if (!isClock(value)) {
    return false;
  }
  const minutes = toMinutes(value);
  return (
    minutes >= toMinutes(DAY_LIMITS.startMin) &&
    minutes <= toMinutes(DAY_LIMITS.startMax) &&
    minutes % DAY_LIMITS.stepMinutes === 0
  );
};

const isDayEnd = (value: string): boolean =>
  isClock(value) &&
  toMinutes(value) <= toMinutes(DAY_LIMITS.endMax) &&
  toMinutes(value) % DAY_LIMITS.stepMinutes === 0;

const dayQuerySchemaBase = z.object({
  date: z.string({ message: DATE_MESSAGE }).refine(isValidDate, { message: DATE_MESSAGE }),
  start: z.string({ message: START_MESSAGE }).refine(isDayStart, { message: START_MESSAGE }),
  end: z.string({ message: END_MESSAGE }).refine(isDayEnd, { message: END_MESSAGE }),
  with: z.enum(COMPANIONS, { message: COMPANION_MESSAGE }),
  tags: z
    .string({ message: EMPTY_TAGS_MESSAGE })
    .transform(splitCsv)
    .pipe(z.array(z.enum(TAGS, { message: TAG_MESSAGE })).min(1, EMPTY_TAGS_MESSAGE))
    .transform((tags) => TAGS.filter((tag) => tags.includes(tag))),
  exclude: z
    .string({ message: EXCLUDE_MESSAGE })
    .optional()
    .transform((value) => (value ? splitCsv(value) : [])),
});

export const dayQuerySchema = dayQuerySchemaBase.superRefine((query, context) => {
  if (
    isDayStart(query.start) &&
    isDayEnd(query.end) &&
    toMinutes(query.end) - toMinutes(query.start) < DAY_LIMITS.minSpanMinutes
  ) {
    context.addIssue({
      code: 'custom',
      message: END_MESSAGE,
      path: ['end'],
    });
  }
});

export type ParsedDayQuery = z.infer<typeof dayQuerySchema>;
export type DayQueryTypeCheck<Output extends DayQuery = ParsedDayQuery> = Output;

export const spotsQuerySchema = z.object({
  tag: z.enum(TAGS, { message: TAG_MESSAGE }).optional(),
  zone: z.enum(ZONES, { message: '권역 값이 올바르지 않아요.' }).optional(),
  kind: z.enum(KINDS, { message: '종류는 spot, restaurant, cafe 중 하나여야 해요.' }).optional(),
});
