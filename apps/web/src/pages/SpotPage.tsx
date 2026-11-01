import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { KIND_LABELS, TAG_LABELS, ZONE_LABELS, formatWeeklyHours } from '@cheongdo/shared';

import { Button } from '../components/ui/Button.js';
import { Chip } from '../components/ui/Chip.js';
import { Container } from '../components/ui/Container.js';
import { NotFoundState } from '../components/ui/NotFoundState.js';
import { Tag } from '../components/ui/Tag.js';
import { Check, Copy, MapPin } from '../components/ui/icons.js';
import { useCourse, type CourseState } from '../hooks/useCourse.js';
import { useSpot } from '../hooks/useSpot.js';
import { ApiError } from '../lib/api.js';
import { formatDuration } from '../lib/format.js';

export function SpotPage() {
  const location = useLocation();
  const state = useSpot();
  const fromQuery = new URLSearchParams(location.search).get('from');
  const hasCourse = fromQuery !== null;
  const courseSearch = hasCourse ? `?${fromQuery}` : '';
  const courseState = useCourse(courseSearch, hasCourse);
  const courseUrl = hasCourse ? `/course${courseSearch}` : '/';
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.status === 'success') {
      document.title = `${state.data.spot.name} — 청도 코스`;
    }
  }, [state]);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
    },
    [],
  );

  async function copyAddress(address: string) {
    setCopied(false);
    setCopyFailed(false);
    if (copyTimer.current !== null) clearTimeout(copyTimer.current);

    try {
      if (!navigator.clipboard?.writeText) throw new Error('클립보드를 사용할 수 없어요.');
      await navigator.clipboard.writeText(address);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  if (
    state.status === 'error' &&
    state.error instanceof ApiError &&
    state.error.code === 'SPOT_NOT_FOUND'
  ) {
    return (
      <Container>
        <NotFoundState
          description="주소가 바뀌었거나 목록에서 빠진 장소예요. 장소 목록에서 다른 장소를 찾아보세요."
          title="찾는 장소가 없어요"
        />
      </Container>
    );
  }

  return (
    <>
      <Container className="py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="현재 위치" className="flex flex-wrap items-center text-xs text-muted">
            <Link className="inline-flex min-h-11 items-center hover:text-ink" to="/">
              홈
            </Link>
            {hasCourse && (
              <>
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
                <Link className="inline-flex min-h-11 items-center hover:text-ink" to={courseUrl}>
                  추천 코스
                </Link>
              </>
            )}
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span aria-current="page" className="text-ink-3">
              {state.status === 'success' ? state.data.spot.name : '장소 상세'}
            </span>
          </nav>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-4 text-sm font-medium hover:bg-surface-2"
            to={courseUrl}
          >
            코스로 돌아가기
          </Link>
        </div>
      </Container>

      {state.status === 'loading' ? (
        <Container>
          <p className="py-16 text-center text-sm text-muted" role="status">
            장소 정보를 불러오고 있어요
          </p>
        </Container>
      ) : state.status === 'error' ? (
        <Container>
          <SpotError error={state.error} />
        </Container>
      ) : (
        <>
          <Container>
            <div className="relative h-[220px] overflow-hidden rounded-card bg-ink text-white sm:h-[360px]">
              {state.data.spot.images[0] ? (
                <>
                  <img
                    alt={state.data.spot.images[0].alt}
                    className="h-full w-full object-cover"
                    src={state.data.spot.images[0].url}
                  />
                  <span className="absolute right-3 bottom-3 rounded bg-ink/75 px-2 py-1 text-xs text-white">
                    {state.data.spot.images[0].credit}
                  </span>
                </>
              ) : (
                <svg
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full text-white"
                  fill="none"
                  preserveAspectRatio="xMidYMid slice"
                  viewBox="0 0 1200 360"
                >
                  <path
                    d="M170 360V242a430 430 0 0 1 860 0v118"
                    opacity=".16"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M255 360V252a345 345 0 0 1 690 0v108"
                    opacity=".22"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M345 360V263a255 255 0 0 1 510 0v97"
                    opacity=".3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M435 360V275a165 165 0 0 1 330 0v85"
                    opacity=".4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M520 360V290a80 80 0 0 1 160 0v70"
                    opacity=".55"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>
          </Container>

          <Container className="py-8 sm:py-10">
            <section aria-labelledby="spot-title">
              <div className="flex flex-wrap gap-2">
                <Chip className="bg-accent-soft text-accent-text">
                  {KIND_LABELS[state.data.spot.kind]}
                </Chip>
                <Chip className="bg-accent-soft text-accent-text">
                  {ZONE_LABELS[state.data.spot.zone]}
                </Chip>
                {state.data.spot.tags.map((tag) => (
                  <Tag key={tag}>{TAG_LABELS[tag]}</Tag>
                ))}
              </div>
              <h1
                className="mt-4 text-[clamp(32px,4vw,48px)] leading-tight font-bold tracking-[-0.035em]"
                id="spot-title"
              >
                {state.data.spot.name}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-ink-2">
                {state.data.spot.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="px-4"
                  onClick={() => void copyAddress(state.data.spot.address)}
                  type="button"
                  variant="secondary"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span aria-live="polite">{copied ? '복사됨' : '주소 복사'}</span>
                </Button>
                <a
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-2"
                  href={`https://map.kakao.com/link/map/${encodeURIComponent(state.data.spot.name)},${state.data.spot.location.lat},${state.data.spot.location.lng}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MapPin className="h-4 w-4" />
                  지도에서 보기
                </a>
              </div>
              {copyFailed && (
                <p className="mt-2 text-xs text-muted" role="status">
                  주소를 복사하지 못했어요. 주소를 직접 선택해 주세요.
                </p>
              )}
            </section>

            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
              <div className="min-w-0 space-y-10">
                <section aria-labelledby="spot-intro-heading">
                  <h2 className="text-xl font-semibold tracking-tight" id="spot-intro-heading">
                    소개
                  </h2>
                  <div className="mt-4 space-y-4 text-[15px] leading-7 text-ink-2">
                    {state.data.spot.description.map((paragraph, index) => (
                      <p key={`${index}-${paragraph}`}>{paragraph}</p>
                    ))}
                  </div>
                </section>

                {state.data.spot.tips.length > 0 && (
                  <section aria-labelledby="spot-tips-heading">
                    <h2 className="text-xl font-semibold tracking-tight" id="spot-tips-heading">
                      방문 팁
                    </h2>
                    <ol className="mt-4 space-y-3">
                      {state.data.spot.tips.map((tip, index) => (
                        <li className="flex gap-3 text-[15px] leading-7 text-ink-2" key={tip}>
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill font-mono text-xs text-ink-3"
                          >
                            {index + 1}
                          </span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {state.data.nearby.length > 0 && (
                  <section aria-labelledby="nearby-heading">
                    <h2 className="text-xl font-semibold tracking-tight" id="nearby-heading">
                      가까운 관광지
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {state.data.nearby.map((nearby) => (
                        <Link
                          className="min-h-11 rounded-card border border-line p-4 hover:bg-surface-2"
                          key={nearby.id}
                          to={`/spots/${nearby.id}${hasCourse ? `?from=${encodeURIComponent(fromQuery)}` : ''}`}
                        >
                          <span className="text-xs text-muted">{ZONE_LABELS[nearby.zone]}</span>
                          <span className="mt-1 block text-base font-semibold">{nearby.name}</span>
                          <span className="mt-2 block text-sm leading-6 text-ink-2">
                            {nearby.summary}
                          </span>
                          <span className="mt-3 block text-xs text-muted">
                            체류 {formatDuration(nearby.stayMinutes)}
                          </span>
                          {nearby.image && (
                            <span className="mt-3 block">
                              <img
                                alt={nearby.image.alt}
                                className="h-20 w-full rounded-lg object-cover"
                                src={nearby.image.url}
                              />
                              <span className="mt-1 block text-xs text-muted">
                                {nearby.image.credit}
                              </span>
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-4">
                <section
                  aria-labelledby="spot-info-heading"
                  className="rounded-card border border-line bg-surface p-5"
                >
                  <h2 className="text-lg font-semibold" id="spot-info-heading">
                    이용 정보
                  </h2>
                  <dl className="mt-4 divide-y divide-line-soft">
                    <InfoRow label="주소">
                      <p>{state.data.spot.address}</p>
                    </InfoRow>
                    <InfoRow label="운영시간">
                      {formatWeeklyHours(state.data.spot.hours).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      {state.data.spot.hours.lastEntryBeforeCloseMinutes !== undefined && (
                        <p>
                          닫기 {state.data.spot.hours.lastEntryBeforeCloseMinutes}분 전 입장 마감
                        </p>
                      )}
                    </InfoRow>
                    {state.data.spot.hours.note && (
                      <InfoRow label="안내">{state.data.spot.hours.note}</InfoRow>
                    )}
                    {state.data.spot.kind === 'restaurant' && state.data.spot.meals && (
                      <InfoRow label="식사">
                        {state.data.spot.meals
                          .map((meal) => (meal === 'lunch' ? '점심' : '저녁'))
                          .join(' · ')}
                      </InfoRow>
                    )}
                    {state.data.spot.fee && <InfoRow label="요금">{state.data.spot.fee}</InfoRow>}
                    {state.data.spot.phone && (
                      <InfoRow label="전화">
                        <a
                          className="inline-flex min-h-11 items-center text-ink underline decoration-line-strong underline-offset-4"
                          href={`tel:${state.data.spot.phone}`}
                        >
                          {state.data.spot.phone}
                        </a>
                      </InfoRow>
                    )}
                    <InfoRow label="체류">{formatDuration(state.data.spot.stayMinutes)}</InfoRow>
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-muted">
                    출처: {state.data.spot.source} · {state.data.spot.checkedAt} 기준. 방문 전
                    확인하세요.
                  </p>
                </section>
                {hasCourse && (
                  <CourseContext
                    courseState={courseState}
                    courseUrl={courseUrl}
                    from={fromQuery ?? ''}
                    spotId={state.data.spot.id}
                  />
                )}
              </aside>
            </div>
          </Container>
        </>
      )}
    </>
  );
}

function InfoRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 space-y-1 text-sm leading-6 text-ink-2">{children}</dd>
    </div>
  );
}

function CourseContext({
  courseState,
  courseUrl,
  from,
  spotId,
}: {
  courseState: CourseState;
  courseUrl: string;
  from: string;
  spotId: string;
}) {
  if (courseState.status !== 'success') return null;

  const items = courseState.data.items;
  const itemIndex = items.findIndex((item) => item.spot.id === spotId);
  const item = items[itemIndex];
  if (!item) return null;

  const previous = items[itemIndex - 1];
  const next = items[itemIndex + 1];

  return (
    <section
      aria-labelledby="spot-course-heading"
      className="rounded-card border border-line bg-surface-2 p-5"
    >
      <h2 className="text-lg font-semibold" id="spot-course-heading">
        이 코스에서
      </h2>
      <p className="mt-2 text-sm text-muted">
        하루 일정 {item.order} / {items.length}번째 · {item.arriveAt}–{item.leaveAt}
      </p>
      <div className="mt-3 space-y-2">
        {previous ? (
          <Link
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2"
            to={`/spots/${previous.spot.id}?from=${encodeURIComponent(from)}`}
          >
            <span className="min-w-0 break-words">이전 · {previous.spot.name}</span>
            <Chip className="shrink-0">{KIND_LABELS[previous.spot.kind]}</Chip>
          </Link>
        ) : (
          <p className="text-sm text-muted">이전 장소 없음</p>
        )}
        {next ? (
          <Link
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-2"
            to={`/spots/${next.spot.id}?from=${encodeURIComponent(from)}`}
          >
            <span className="min-w-0 break-words">다음 · {next.spot.name}</span>
            <span className="shrink-0 text-xs text-muted">
              <span className="block text-right">
                <Chip>{KIND_LABELS[next.spot.kind]}</Chip>
              </span>
              차로 약 {next.travelMinutes}분
            </span>
          </Link>
        ) : (
          <p className="text-sm text-muted">다음 장소 없음</p>
        )}
      </div>
      <Link
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent-text"
        to={courseUrl}
      >
        코스 전체 보기
      </Link>
    </section>
  );
}

function SpotError({ error }: { error: Error }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted" role="alert">
        장소를 불러오지 못했어요. {error.message}
      </p>
      <Link
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2"
        to="/"
      >
        홈으로
      </Link>
    </div>
  );
}
