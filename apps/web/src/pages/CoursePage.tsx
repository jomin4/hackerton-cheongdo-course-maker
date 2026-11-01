import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { COMPANION_LABELS, TAG_LABELS, type Companion, type DayPlan } from '@cheongdo/shared';

import { NotFoundState } from '../components/ui/NotFoundState.js';
import { CourseSummary } from '../components/course/CourseSummary.js';
import { CourseTimeline } from '../components/course/CourseTimeline.js';
import { ExcludedSpots } from '../components/course/ExcludedSpots.js';
import { Button } from '../components/ui/Button.js';
import { Chip } from '../components/ui/Chip.js';
import { Container } from '../components/ui/Container.js';
import { AlertTriangle, Check, Clock, Copy, RefreshCw, Search } from '../components/ui/icons.js';
import { useCourse } from '../hooks/useCourse.js';
import { ApiError, type ApiErrorDetail } from '../lib/api.js';
import { formatDateLabel } from '../lib/date.js';
import { formatTimeRange } from '../lib/format.js';
import { toCourseUrl } from '../lib/query.js';

const companionHeadlines: Record<Companion, string> = {
  solo: '혼자 떠나는',
  couple: '커플과 함께하는',
  family: '가족과 함께하는',
  friends: '친구들과 함께하는',
};

export function CoursePage() {
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const state = useCourse(undefined, true, retryCount);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareUrl = `${window.location.origin}${location.pathname}${location.search}`;

  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
    },
    [],
  );

  async function copyLink() {
    setCopied(false);
    setCopyFailed(false);
    if (copyTimer.current !== null) clearTimeout(copyTimer.current);

    try {
      if (!navigator.clipboard?.writeText) throw new Error('클립보드를 사용할 수 없어요.');
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <>
      <section className="bg-surface-2 py-8 sm:py-10">
        <Container>
          <nav aria-label="현재 위치" className="text-xs text-muted">
            <Link className="inline-flex min-h-11 items-center hover:text-ink" to="/">
              홈
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span aria-current="page" className="text-ink-3">
              추천 코스
            </span>
          </nav>

          {state.status === 'success' ? (
            <>
              <h1 className="mt-3 text-[clamp(28px,3.4vw,42px)] leading-tight font-bold tracking-[-0.035em]">
                {formatDateLabel(state.data.conditions.date)}{' '}
                {companionHeadlines[state.data.conditions.with]} 청도 하루
              </h1>
              <div className="mt-5 flex flex-wrap gap-2">
                <Chip className="border border-line bg-surface">
                  {formatDateLabel(state.data.conditions.date)}
                </Chip>
                <Chip className="border border-line bg-surface">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {formatTimeRange(state.data.conditions.start, state.data.conditions.end)}
                </Chip>
                <Chip className="border border-line bg-surface">
                  {COMPANION_LABELS[state.data.conditions.with]}
                </Chip>
                {state.data.conditions.tags.map((tag) => (
                  <Chip className="border border-line bg-surface" key={tag}>
                    {TAG_LABELS[tag]}
                  </Chip>
                ))}
              </div>
            </>
          ) : (
            <h1 className="mt-3 text-[clamp(28px,3.4vw,42px)] leading-tight font-bold tracking-[-0.035em]">
              추천 코스
            </h1>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-2"
              to={`/${location.search}`}
            >
              조건 수정
            </Link>
            <Button className="px-4" onClick={copyLink} type="button">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span aria-live="polite">{copied ? '복사됨' : '링크 복사'}</span>
            </Button>
          </div>
          {copyFailed && (
            <div className="mt-3 max-w-xl">
              <label className="mb-1 block text-xs text-muted" htmlFor="share-url">
                링크를 선택해 복사해 주세요
              </label>
              <input
                className="min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 font-mono text-xs text-ink"
                id="share-url"
                onFocus={(event) => event.currentTarget.select()}
                readOnly
                value={shareUrl}
              />
            </div>
          )}
        </Container>
      </section>

      <Container className="flex flex-wrap gap-6 py-8 sm:py-10">
        {state.status === 'loading' ? (
          <CourseSkeleton />
        ) : state.status === 'error' ? (
          <ErrorState
            error={state.error}
            onRetry={() => setRetryCount((count) => count + 1)}
            search={location.search}
          />
        ) : state.data.items.filter((item) => item.type === 'visit').length === 0 ? (
          <EmptyCourse plan={state.data} />
        ) : (
          <>
            <div className="order-2 w-full min-w-0 flex-[999_1_560px] md:order-1">
              {state.data.notices.length > 0 && (
                <div
                  aria-label="일정 안내"
                  className="mb-5 rounded-card border border-line bg-surface-2 p-4 text-sm leading-6 text-ink-2"
                  role="status"
                >
                  {state.data.notices.map((notice) => (
                    <p className="break-words" key={notice}>
                      {notice}
                    </p>
                  ))}
                </div>
              )}
              <CourseTimeline plan={state.data} />
            </div>
            <aside className="order-1 w-full min-w-0 flex-[1_1_320px] md:order-2">
              <div className="space-y-4">
                <CourseSummary plan={state.data} />
                <ExcludedSpots plan={state.data} />
                <p className="rounded-card border border-line bg-surface-2 p-4 text-sm leading-6 text-muted">
                  이동 시간은 직선거리에 도로 보정을 더해 어림한 값이에요. 실제 교통 상황에 따라
                  달라질 수 있어요.
                </p>
              </div>
            </aside>
          </>
        )}
      </Container>
    </>
  );
}

function CourseSkeleton() {
  return (
    <div aria-live="polite" className="w-full max-w-3xl" role="status">
      <div aria-hidden="true">
        <div className="h-8 w-2/3 max-w-lg rounded bg-fill" />
        <div className="mt-5 flex gap-2">
          {[0, 1, 2].map((chip) => (
            <div className="h-8 w-20 rounded-full bg-fill" key={chip} />
          ))}
        </div>
        <div className="mt-8 space-y-4">
          {[1, 2].map((number) => (
            <div className="flex gap-4" key={number}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fill font-mono text-xs text-muted">
                0{number}
              </span>
              <div className="flex-1 rounded-card border border-line p-5">
                <div className="h-5 w-1/3 rounded bg-fill" />
                <div className="mt-4 h-4 w-full rounded bg-fill" />
                <div className="mt-2 h-4 w-2/3 rounded bg-fill" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-8 flex min-h-11 items-center justify-center gap-2 text-sm text-muted">
        <RefreshCw aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
        코스를 계산하고 있어요
      </p>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  search,
}: {
  error: Error;
  onRetry: () => void;
  search: string;
}) {
  if (error instanceof ApiError && error.code === 'SPOT_NOT_FOUND') {
    return (
      <NotFoundState
        description="주소가 바뀌었거나 목록에서 빠진 장소예요. 관광지 목록에서 다른 장소를 찾아보세요."
        title="찾는 장소가 없어요"
      />
    );
  }

  if (error instanceof ApiError && error.code === 'INVALID_QUERY') {
    return (
      <section aria-labelledby="course-error-title" className="w-full max-w-2xl py-10" role="alert">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
          <AlertTriangle aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold" id="course-error-title">
          조건을 다시 확인해 주세요
        </h2>
        <code className="mt-4 block break-all rounded-lg border border-line bg-surface-2 p-4 font-mono text-xs leading-6">
          {renderQuery(search, error.details)}
        </code>
        <p className="mt-3 text-sm leading-6 text-ink-2">{error.message}</p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2"
          to={`/${search}`}
        >
          조건 다시 고르기
        </Link>
      </section>
    );
  }

  const message =
    error instanceof ApiError && error.code === 'NETWORK_ERROR'
      ? '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
      : error.message;

  return (
    <section aria-labelledby="course-error-title" className="w-full max-w-xl py-10" role="alert">
      <h2 className="text-2xl font-semibold" id="course-error-title">
        잠시 문제가 생겼어요
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
      <Button className="mt-6" onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        다시 시도
      </Button>
    </section>
  );
}

function renderQuery(search: string, details: ApiErrorDetail[]) {
  const parts = search.replace(/^\?/, '').split('&').filter(Boolean);

  return parts.map((part, index) => {
    const separatorIndex = part.indexOf('=');
    const rawField = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? '' : part.slice(separatorIndex + 1);
    const field = decodeQueryPart(rawField);
    const value = decodeQueryPart(rawValue);
    const hasIssue = details.some((detail) => detail.field === field && detail.value === value);

    return (
      <span key={`${index}-${part}`}>
        {index > 0 ? '&' : ''}
        {rawField}=
        <span className={hasIssue ? 'font-semibold text-accent-text' : ''}>{rawValue}</span>
      </span>
    );
  });
}

function decodeQueryPart(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function EmptyCourse({ plan }: { plan: DayPlan }) {
  const { conditions } = plan;
  const interestLabels = conditions.tags.map((tag) => TAG_LABELS[tag]).join(', ');
  const homeUrl = toCourseUrl(conditions).replace(/^\/course/, '/');

  return (
    <section aria-labelledby="empty-course-title" className="w-full max-w-2xl py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
        <Search aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold" id="empty-course-title">
        조건에 맞는 장소를 찾지 못했어요
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        {formatTimeRange(conditions.start, conditions.end)} 안에 담을 수 있는 '{interestLabels}'
        장소가 없어요. 끝 시각을 늦추거나 관심사를 더 골라보세요.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {conditions.end < '21:00' && (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2"
            to={toCourseUrl({ ...conditions, end: '21:00' })}
          >
            끝 시각 늦추기
          </Link>
        )}
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium hover:bg-surface-2"
          to={homeUrl}
        >
          관심사 더 고르기
        </Link>
      </div>
    </section>
  );
}
