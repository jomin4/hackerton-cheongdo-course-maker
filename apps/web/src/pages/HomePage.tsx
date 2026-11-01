import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  COMPANIONS,
  COMPANION_LABELS,
  TAGS,
  TAG_LABELS,
  ZONE_LABELS,
  type Companion,
  type DayQuery,
  type SpotSummary,
  type Tag,
} from '@cheongdo/shared';

import { Container } from '../components/ui/Container.js';
import { Button } from '../components/ui/Button.js';
import { Chip } from '../components/ui/Chip.js';
import { SectionLabel } from '../components/ui/SectionLabel.js';
import { Tag as TagPill } from '../components/ui/Tag.js';
import { ArrowRight, Check, Clock, Link as LinkIcon, MapPin } from '../components/ui/icons.js';
import { fetchJson } from '../lib/api.js';
import { formatDateLabel, todayInSeoul } from '../lib/date.js';
import { formatDuration } from '../lib/format.js';
import {
  endOptions,
  fromDaySearchParams,
  sortTags,
  START_OPTIONS,
  toCourseUrl,
} from '../lib/query.js';

const steps = [
  {
    number: '01',
    title: '조건 고르기',
    description: '방문 날짜와 시간, 동행, 관심사를 선택해요.',
  },
  {
    number: '02',
    title: '잘 맞는 장소 담기',
    description: '선택한 조건에 맞는 청도 명소를 찾아요.',
  },
  {
    number: '03',
    title: '동선 정리',
    description: '이동 시간까지 계산해 코스를 완성해요.',
  },
];

export function HomePage() {
  const [searchParams] = useSearchParams();
  const [today] = useState(() => todayInSeoul(new Date()));
  const [query, setQuery] = useState<DayQuery>(() => fromDaySearchParams(searchParams, today));
  const [spots, setSpots] = useState<SpotSummary[]>([]);
  const [spotsError, setSpotsError] = useState('');
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const courseUrl = toCourseUrl(query);
  const canCreateCourse = query.tags.length > 0;

  useEffect(() => {
    let active = true;

    void fetchJson<{ items: SpotSummary[] }>('/api/spots?kind=spot')
      .then(({ items }) => {
        if (active) {
          setSpots(items.slice(0, 6));
          setSpotsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSpotsError(error instanceof Error ? error.message : '관광지를 불러오지 못했어요.');
          setSpotsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [retryCount]);

  function updateDate(date: string) {
    setQuery((current) => ({
      ...current,
      date: !date || date < today ? today : date,
    }));
  }

  function updateStart(start: string) {
    setQuery((current) => {
      const availableEndOptions = endOptions(start);

      return {
        ...current,
        start,
        end: availableEndOptions.includes(current.end)
          ? current.end
          : (availableEndOptions[0] ?? current.end),
      };
    });
  }

  function updateEnd(end: string) {
    setQuery((current) => ({ ...current, end }));
  }

  function updateCompanion(companion: Companion) {
    setQuery((current) => ({ ...current, with: companion }));
  }

  function toggleTag(tag: Tag) {
    setQuery((current) => ({
      ...current,
      tags: sortTags(
        current.tags.includes(tag)
          ? current.tags.filter((selected) => selected !== tag)
          : [...current.tags, tag],
      ),
    }));
  }

  function createCourse() {
    if (canCreateCourse) navigate(courseUrl);
  }

  function retrySpots() {
    setSpotsError('');
    setSpotsLoading(true);
    setRetryCount((count) => count + 1);
  }

  return (
    <>
      <section className="hero-grid border-b border-line">
        <Container className="grid gap-10 py-12 md:grid-cols-[1fr_0.92fr] md:items-center md:gap-12 md:py-20 lg:gap-20">
          <div className="max-w-[570px]">
            <Chip className="border-accent/20 bg-surface text-accent-text">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-accent" />
              청도 여행 코스 플래너
            </Chip>
            <h1 className="mt-7 text-[clamp(38px,5vw,64px)] leading-[1.08] font-bold tracking-[-0.04em]">
              청도 여행,
              <br />
              세 번만 고르면
              <br />
              코스가 됩니다.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-ink-3 md:text-[17px]">
              방문 날짜와 시간, 함께하는 사람, 관심사를 선택하면 청도에 꼭 맞는 여행 코스를 추천해
              드려요.
            </p>
            <ul className="mt-7 grid gap-3 text-sm text-ink-2 sm:grid-cols-3 md:grid-cols-1">
              {['가입 없이 바로', '이동 시간 자동 계산', '링크 하나로 공유'].map((benefit) => (
                <li className="flex items-center gap-2.5" key={benefit}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <section
            aria-labelledby="conditions-title"
            className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
            id="conditions"
          >
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <p className="font-mono text-xs tracking-wide text-subtle">코스 조건 · 3 STEPS</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight" id="conditions-title">
                여행 조건을 골라주세요
              </h2>
            </div>

            <div className="space-y-6 px-5 py-6 sm:px-6">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  <span className="mr-2 font-mono text-xs text-subtle">01</span>
                  방문 날짜와 시간
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-medium text-muted">
                    방문 날짜
                    <input
                      className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                      min={today}
                      onChange={(event) => updateDate(event.target.value)}
                      type="date"
                      value={query.date}
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    시작
                    <select
                      className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                      onChange={(event) => updateStart(event.target.value)}
                      value={query.start}
                    >
                      {START_OPTIONS.map((start) => (
                        <option key={start} value={start}>
                          {start}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    끝
                    <select
                      className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink"
                      onChange={(event) => updateEnd(event.target.value)}
                      value={query.end}
                    >
                      {endOptions(query.start).map((end) => (
                        <option key={end} value={end}>
                          {end}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  점심 · 쉬어 가기 · 저녁까지 시간에 맞춰 넣어 드려요.
                </p>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  <span className="mr-2 font-mono text-xs text-subtle">02</span>
                  누구와 함께
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {COMPANIONS.map((companion) => (
                    <ChoiceButton
                      key={companion}
                      label={COMPANION_LABELS[companion]}
                      onClick={() => updateCompanion(companion)}
                      pressed={query.with === companion}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  <span className="mr-2 font-mono text-xs text-subtle">03</span>
                  관심사
                  <span className="ml-2 font-normal text-muted">여러 개 선택할 수 있어요</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => (
                    <ChoiceButton
                      key={tag}
                      label={TAG_LABELS[tag]}
                      onClick={() => toggleTag(tag)}
                      pressed={query.tags.includes(tag)}
                      shape="pill"
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="border-t border-line bg-surface-2 px-5 py-5 sm:px-6">
              <p className="text-xs font-medium text-muted">선택한 조건</p>
              <p className="mt-1 text-sm font-medium">
                {formatDateLabel(query.date)} {query.start}–{query.end}
                <span className="mx-1 text-subtle">·</span>
                {COMPANION_LABELS[query.with]}
                {query.tags.map((tag) => (
                  <span key={tag}>
                    <span className="mx-1 text-subtle">·</span>
                    {TAG_LABELS[tag]}
                  </span>
                ))}
              </p>
              <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
                <LinkIcon className="h-4 w-4 shrink-0 text-muted" />
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink-3">
                  {courseUrl}
                </code>
              </div>
              <Button
                className="mt-3 w-full"
                disabled={!canCreateCourse}
                onClick={createCourse}
                type="button"
              >
                코스 만들기
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!canCreateCourse && (
                <p className="mt-2 text-center text-sm text-muted" role="status">
                  관심사를 하나 이상 골라주세요
                </p>
              )}
            </div>
          </section>
        </Container>
      </section>

      <section className="py-20 md:py-24" id="how">
        <Container>
          <div className="max-w-2xl">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              세 번의 선택으로
              <br className="sm:hidden" /> 여행을 시작해요
            </h2>
          </div>
          <div className="mt-9 grid overflow-hidden rounded-card border border-line md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                className={`min-h-44 p-5 sm:p-6 ${index > 0 ? 'border-t border-line md:border-t-0 md:border-l' : ''}`}
                key={step.number}
              >
                <span className="font-mono text-xs text-subtle">{step.number}</span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-surface-2 py-20 md:py-24" id="spots">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Places</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                청도의 매력을 만나요
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted">
              관심 있는 장소를 둘러보고 나만의 코스에 담아보세요.
            </p>
          </div>

          {spotsError ? (
            <div
              className="mt-8 rounded-card border border-line bg-surface px-5 py-8 text-center"
              role="alert"
            >
              <p className="text-sm text-muted">{spotsError}</p>
              <Button className="mt-4" onClick={retrySpots} type="button" variant="secondary">
                다시 불러오기
              </Button>
            </div>
          ) : spotsLoading ? (
            <p className="mt-8 py-10 text-center text-sm text-muted" role="status">
              관광지를 불러오고 있어요
            </p>
          ) : spots.length === 0 ? (
            <p className="mt-8 py-10 text-center text-sm text-muted" role="status">
              등록된 관광지가 없어요
            </p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spots.map((spot, index) => (
                <SpotCard key={spot.id} number={index + 1} spot={spot} />
              ))}
            </div>
          )}
        </Container>
      </section>

      <section className="py-20 md:py-24">
        <Container className="flex flex-col items-start justify-between gap-6 rounded-card border border-line p-6 sm:flex-row sm:items-center sm:p-10">
          <div>
            <SectionLabel>Start your trip</SectionLabel>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              이번 주말 청도, 어디부터 갈까요?
            </h2>
          </div>
          <Button
            className="shrink-0"
            onClick={() =>
              document.getElementById('conditions')?.scrollIntoView({ behavior: 'smooth' })
            }
            type="button"
          >
            코스 만들기
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Container>
      </section>
    </>
  );
}

function ChoiceButton({
  label,
  onClick,
  pressed,
  supportingText,
  shape = 'rounded',
}: {
  label: string;
  onClick: () => void;
  pressed: boolean;
  supportingText?: string;
  shape?: 'rounded' | 'pill';
}) {
  return (
    <button
      aria-pressed={pressed}
      className={`flex min-h-11 items-center justify-center border px-2 text-center transition-colors ${
        shape === 'pill' ? 'rounded-full px-4' : 'flex-col rounded-control'
      } ${
        pressed
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-surface text-ink-3 hover:border-line-strong hover:bg-surface-2'
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="text-sm font-medium">{label}</span>
      {supportingText && (
        <span className={`mt-0.5 text-xs ${pressed ? 'text-white/75' : 'text-muted'}`}>
          {supportingText}
        </span>
      )}
    </button>
  );
}

function SpotCard({ number, spot }: { number: number; spot: SpotSummary }) {
  return (
    <Link
      className="group overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-line-strong"
      to={`/spots/${spot.id}`}
    >
      {spot.image && (
        <>
          <img alt={spot.image.alt} className="h-40 w-full object-cover" src={spot.image.url} />
          <p className="px-5 pt-2 text-xs text-muted">{spot.image.credit}</p>
        </>
      )}
      <div className="flex h-16 items-start justify-between border-b border-line bg-[radial-gradient(var(--color-line-strong)_0.7px,transparent_0.7px)] [background-size:10px_10px] px-5 py-4">
        <span className="font-mono text-sm text-subtle">{String(number).padStart(2, '0')}</span>
        <Chip className="bg-surface">{ZONE_LABELS[spot.zone]}</Chip>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold tracking-tight group-hover:text-accent-text">
          {spot.name}
        </h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{spot.summary}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {spot.tags.map((tag) => (
            <TagPill key={tag}>{TAG_LABELS[tag]}</TagPill>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {ZONE_LABELS[spot.zone]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(spot.stayMinutes)}
          </span>
        </div>
      </div>
    </Link>
  );
}
