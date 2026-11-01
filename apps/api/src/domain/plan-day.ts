import {
  DAY_LIMITS,
  MEAL_MINUTES,
  MEAL_WINDOWS,
  START_CANDIDATES,
  TAGS,
  TRAVEL_WEIGHT,
  toClock,
  toMinutes,
  weekdayOf,
} from '@cheongdo/shared';
import type {
  DayPlan,
  DayPlanItem,
  DayQuery,
  ExcludedSpot,
  Meal,
  Spot,
  Tag,
  Weekday,
} from '@cheongdo/shared';
import { fitVisit } from './opening.js';
import { toSpotSummary } from './spot-summary.js';
import { haversineKm, travelMinutes } from './travel.js';

const TAG_MATCH_SCORE = 10;
const COMPANION_MATCH_SCORE = 5;
const DISTANCE_PRECISION = 10;
const RESTAURANT_NOTICE = '이 시간에 영업하는 식당을 찾지 못했어요';
const CAFE_NOTICE = '이 시간에 영업하는 카페를 찾지 못했어요';

interface Candidate {
  spot: Spot;
  matchedTags: Tag[];
  score: number;
  priority: 'primary' | 'supplement';
}

interface TravelLeg {
  distanceKm: number;
  travelMinutes: number;
}

interface MutablePlan {
  items: DayPlanItem[];
  notices: string[];
  usedIds: Set<string>;
  position: Spot | undefined;
  minute: number;
  visitScore: number;
  travelTotal: number;
  startId: string;
}

interface PlannedVisit {
  candidate: Candidate;
  leg: TravelLeg;
  arriveMinute: number;
  leaveMinute: number;
  waitMinutes: number;
}

function compareIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareCandidates(left: Candidate, right: Candidate): number {
  return right.score - left.score || compareIds(left.spot.id, right.spot.id);
}

function scoreCandidates(spots: Spot[], query: DayQuery): Candidate[] {
  const excludedIds = new Set(query.exclude);
  const candidates: Candidate[] = [];

  for (const spot of spots) {
    if (spot.kind !== 'spot' || excludedIds.has(spot.id)) {
      continue;
    }

    const matchedTags = TAGS.filter((tag) => query.tags.includes(tag) && spot.tags.includes(tag));
    const score =
      matchedTags.length * TAG_MATCH_SCORE +
      (spot.goodFor.includes(query.with) ? COMPANION_MATCH_SCORE : 0);

    if (score > 0) {
      candidates.push({
        spot,
        matchedTags,
        score,
        priority: matchedTags.length > 0 ? 'primary' : 'supplement',
      });
    }
  }

  return candidates.sort(compareCandidates);
}

function travelLegFrom(position: Spot | undefined, destination: Spot): TravelLeg {
  if (!position) {
    return { distanceKm: 0, travelMinutes: 0 };
  }

  const distanceKm = haversineKm(position.location, destination.location);
  return { distanceKm, travelMinutes: travelMinutes(distanceKm) };
}

function isOpenOn(spot: Spot, weekday: Weekday): boolean {
  return spot.hours.days[weekday].length > 0;
}

function addNotice(plan: MutablePlan, notice: string): void {
  if (!plan.notices.includes(notice)) {
    plan.notices.push(notice);
  }
}

function getPendingMeals(query: DayQuery): Meal[] {
  const startMinute = toMinutes(query.start);
  const endMinute = toMinutes(query.end);
  const meals: Meal[] = [];

  if (
    startMinute <= toMinutes(DAY_LIMITS.lunchStartMax) &&
    endMinute >= toMinutes(DAY_LIMITS.lunchEndMin)
  ) {
    meals.push('lunch');
  }
  if (endMinute >= toMinutes(DAY_LIMITS.dinnerEndMin)) {
    meals.push('dinner');
  }

  return meals;
}

function getDayRestaurants(spots: Spot[], weekday: Weekday, meal: Meal): Spot[] {
  return spots.filter(
    (spot) =>
      spot.kind === 'restaurant' && spot.meals?.includes(meal) === true && isOpenOn(spot, weekday),
  );
}

function getNearestRestaurantTravel(restaurants: Spot[], position: Spot): number | undefined {
  const travelTimes = restaurants.map(
    (restaurant) => travelLegFrom(position, restaurant).travelMinutes,
  );
  return travelTimes.length > 0 ? Math.min(...travelTimes) : undefined;
}

function planTouristVisit(
  candidate: Candidate,
  position: Spot | undefined,
  minute: number,
  weekday: Weekday,
  endMinute: number,
): PlannedVisit | null {
  const leg = travelLegFrom(position, candidate.spot);
  const fit = fitVisit(
    candidate.spot,
    weekday,
    minute + leg.travelMinutes,
    candidate.spot.stayMinutes,
  );
  if (!fit) {
    return null;
  }

  const leaveMinute = fit.arriveMinute + candidate.spot.stayMinutes;
  if (leaveMinute > endMinute) {
    return null;
  }

  return {
    candidate,
    leg,
    arriveMinute: fit.arriveMinute,
    leaveMinute,
    waitMinutes: fit.waitMinutes,
  };
}

function canReachMealWindow(
  visit: PlannedVisit,
  pendingMeal: Meal | undefined,
  restaurants: Spot[],
  usedIds: Set<string>,
): boolean {
  if (!pendingMeal) {
    return true;
  }

  const nearestTravel = getNearestRestaurantTravel(
    restaurants.filter((restaurant) => !usedIds.has(restaurant.id)),
    visit.candidate.spot,
  );
  if (nearestTravel === undefined) {
    return false;
  }

  return visit.leaveMinute + nearestTravel <= toMinutes(MEAL_WINDOWS[pendingMeal].to);
}

function canVisitBeforeDinner(spot: Spot, weekday: Weekday, dinnerPending: boolean): boolean {
  if (!dinnerPending) {
    return true;
  }

  const dinnerToMinute = toMinutes(MEAL_WINDOWS.dinner.to);
  return !spot.hours.days[weekday].some((range) => toMinutes(range.close) > dinnerToMinute);
}

function getEligibleTouristVisits(
  candidates: Candidate[],
  plan: MutablePlan,
  weekday: Weekday,
  endMinute: number,
  pendingMeal: Meal | undefined,
  dinnerPending: boolean,
  restaurants: Spot[],
): PlannedVisit[] {
  return candidates
    .filter(
      ({ spot }) =>
        !plan.usedIds.has(spot.id) && canVisitBeforeDinner(spot, weekday, dinnerPending),
    )
    .flatMap((candidate) => {
      const visit = planTouristVisit(candidate, plan.position, plan.minute, weekday, endMinute);
      return visit && canReachMealWindow(visit, pendingMeal, restaurants, plan.usedIds)
        ? [visit]
        : [];
    });
}

function compareVisitValues(left: PlannedVisit, right: PlannedVisit): number {
  const leftValue =
    left.candidate.score - TRAVEL_WEIGHT * (left.leg.travelMinutes + left.waitMinutes);
  const rightValue =
    right.candidate.score - TRAVEL_WEIGHT * (right.leg.travelMinutes + right.waitMinutes);

  return (
    rightValue - leftValue ||
    left.leg.travelMinutes - right.leg.travelMinutes ||
    compareIds(left.candidate.spot.id, right.candidate.spot.id)
  );
}

function chooseTouristVisit(
  candidates: Candidate[],
  plan: MutablePlan,
  weekday: Weekday,
  endMinute: number,
  pendingMeals: Meal[],
  restaurants: Spot[],
  startingCandidate: Candidate | undefined,
): PlannedVisit | null {
  const pendingMeal = pendingMeals[0];
  const dinnerPending = pendingMeals.includes('dinner');

  if (plan.items.every((item) => item.type !== 'visit') && startingCandidate) {
    const startingVisit = planTouristVisit(
      startingCandidate,
      plan.position,
      plan.minute,
      weekday,
      endMinute,
    );
    if (
      startingVisit &&
      canVisitBeforeDinner(startingCandidate.spot, weekday, dinnerPending) &&
      canReachMealWindow(startingVisit, pendingMeal, restaurants, plan.usedIds)
    ) {
      return startingVisit;
    }
  }

  const primaryVisits = getEligibleTouristVisits(
    candidates.filter(({ priority }) => priority === 'primary'),
    plan,
    weekday,
    endMinute,
    pendingMeal,
    dinnerPending,
    restaurants,
  );
  if (primaryVisits.length > 0) {
    return primaryVisits.sort(compareVisitValues)[0] ?? null;
  }

  const supplementVisits = getEligibleTouristVisits(
    candidates.filter(({ priority }) => priority === 'supplement'),
    plan,
    weekday,
    endMinute,
    pendingMeal,
    dinnerPending,
    restaurants,
  );
  return supplementVisits.sort(compareVisitValues)[0] ?? null;
}

function appendPlanItem(
  plan: MutablePlan,
  spot: Spot,
  type: DayPlanItem['type'],
  meal: Meal | undefined,
  leg: TravelLeg,
  arriveMinute: number,
  leaveMinute: number,
  waitMinutes: number,
  matchedTags: Tag[],
  score: number,
): void {
  plan.items.push({
    order: plan.items.length + 1,
    type,
    ...(meal ? { meal } : {}),
    spot: toSpotSummary(spot),
    travelMinutes: leg.travelMinutes,
    waitMinutes,
    distanceKm: Math.round(leg.distanceKm * DISTANCE_PRECISION) / DISTANCE_PRECISION,
    arriveAt: toClock(arriveMinute),
    leaveAt: toClock(leaveMinute),
    matchedTags: [...matchedTags],
    score,
  });
  plan.usedIds.add(spot.id);
  plan.position = spot;
  plan.minute = leaveMinute;
  plan.travelTotal += leg.travelMinutes;
  if (type === 'visit') {
    plan.visitScore += score;
  }
}

function addChosenVisit(plan: MutablePlan, visit: PlannedVisit): void {
  appendPlanItem(
    plan,
    visit.candidate.spot,
    'visit',
    undefined,
    visit.leg,
    visit.arriveMinute,
    visit.leaveMinute,
    visit.waitMinutes,
    visit.candidate.matchedTags,
    visit.candidate.score,
  );
}

function chooseMealRestaurant(
  restaurants: Spot[],
  plan: MutablePlan,
  weekday: Weekday,
  meal: Meal,
  endMinute: number,
): { spot: Spot; leg: TravelLeg; arriveMinute: number; waitMinutes: number } | null {
  const fromMinute = toMinutes(MEAL_WINDOWS[meal].from);
  const toMinute = toMinutes(MEAL_WINDOWS[meal].to);

  const choices = restaurants
    .filter((spot) => !plan.usedIds.has(spot.id))
    .flatMap((spot) => {
      const leg = travelLegFrom(plan.position, spot);
      const travelArrival = plan.minute + leg.travelMinutes;
      const fit = fitVisit(spot, weekday, Math.max(travelArrival, fromMinute), MEAL_MINUTES);
      if (!fit || fit.arriveMinute > toMinute || fit.arriveMinute + MEAL_MINUTES > endMinute) {
        return [];
      }

      return [
        {
          spot,
          leg,
          arriveMinute: fit.arriveMinute,
          waitMinutes: fit.arriveMinute - travelArrival,
        },
      ];
    });

  return (
    choices.sort(
      (left, right) =>
        left.leg.travelMinutes - right.leg.travelMinutes || compareIds(left.spot.id, right.spot.id),
    )[0] ?? null
  );
}

function chooseRestCafe(
  spots: Spot[],
  plan: MutablePlan,
  weekday: Weekday,
  endMinute: number,
): { spot: Spot; leg: TravelLeg; arriveMinute: number; waitMinutes: number } | null {
  const choices = spots
    .filter((spot) => spot.kind === 'cafe' && !plan.usedIds.has(spot.id))
    .flatMap((spot) => {
      const leg = travelLegFrom(plan.position, spot);
      const travelArrival = plan.minute + leg.travelMinutes;
      const fit = fitVisit(spot, weekday, travelArrival, spot.stayMinutes);
      if (!fit || fit.arriveMinute + spot.stayMinutes > endMinute) {
        return [];
      }

      return [
        {
          spot,
          leg,
          arriveMinute: fit.arriveMinute,
          waitMinutes: fit.arriveMinute - travelArrival,
        },
      ];
    });

  return (
    choices.sort(
      (left, right) =>
        left.leg.travelMinutes - right.leg.travelMinutes || compareIds(left.spot.id, right.spot.id),
    )[0] ?? null
  );
}

function addMealAndRest(
  plan: MutablePlan,
  spots: Spot[],
  weekday: Weekday,
  meal: Meal,
  restaurants: Spot[],
  endMinute: number,
): void {
  const restaurant = chooseMealRestaurant(restaurants, plan, weekday, meal, endMinute);
  if (!restaurant) {
    addNotice(plan, RESTAURANT_NOTICE);
    return;
  }

  appendPlanItem(
    plan,
    restaurant.spot,
    'meal',
    meal,
    restaurant.leg,
    restaurant.arriveMinute,
    restaurant.arriveMinute + MEAL_MINUTES,
    restaurant.waitMinutes,
    [],
    0,
  );

  if (meal !== 'lunch') {
    return;
  }

  const cafe = chooseRestCafe(spots, plan, weekday, endMinute);
  if (!cafe) {
    addNotice(plan, CAFE_NOTICE);
    return;
  }

  appendPlanItem(
    plan,
    cafe.spot,
    'rest',
    undefined,
    cafe.leg,
    cafe.arriveMinute,
    cafe.arriveMinute + cafe.spot.stayMinutes,
    cafe.waitMinutes,
    [],
    0,
  );
}

function addClosedRestaurantNotices(
  plan: MutablePlan,
  pendingMeals: Meal[],
  spots: Spot[],
  weekday: Weekday,
): void {
  while (pendingMeals[0]) {
    const meal = pendingMeals[0];
    if (getDayRestaurants(spots, weekday, meal).length > 0) {
      return;
    }
    addNotice(plan, RESTAURANT_NOTICE);
    pendingMeals.shift();
  }
}

function runDayPlan(
  spots: Spot[],
  query: DayQuery,
  candidates: Candidate[],
  startingCandidate: Candidate | undefined,
): MutablePlan {
  const weekday = weekdayOf(query.date);
  const endMinute = toMinutes(query.end);
  const pendingMeals = getPendingMeals(query);
  const plan: MutablePlan = {
    items: [],
    notices: [],
    usedIds: new Set(),
    position: undefined,
    minute: toMinutes(query.start),
    visitScore: 0,
    travelTotal: 0,
    startId: startingCandidate?.spot.id ?? '',
  };

  while (true) {
    addClosedRestaurantNotices(plan, pendingMeals, spots, weekday);

    const meal = pendingMeals[0];
    if (meal && plan.minute >= toMinutes(MEAL_WINDOWS[meal].from)) {
      pendingMeals.shift();
      addMealAndRest(
        plan,
        spots,
        weekday,
        meal,
        getDayRestaurants(spots, weekday, meal),
        endMinute,
      );
      continue;
    }

    const visit = chooseTouristVisit(
      candidates,
      plan,
      weekday,
      endMinute,
      pendingMeals,
      meal ? getDayRestaurants(spots, weekday, meal) : [],
      startingCandidate,
    );
    if (visit) {
      addChosenVisit(plan, visit);
      continue;
    }

    if (meal) {
      pendingMeals.shift();
      addMealAndRest(
        plan,
        spots,
        weekday,
        meal,
        getDayRestaurants(spots, weekday, meal),
        endMinute,
      );
      continue;
    }

    break;
  }

  return plan;
}

function comparePlans(left: MutablePlan, right: MutablePlan): number {
  return (
    right.visitScore - left.visitScore ||
    left.travelTotal - right.travelTotal ||
    compareIds(left.startId, right.startId)
  );
}

function getStartingCandidates(candidates: Candidate[], weekday: Weekday): Candidate[] {
  const primary = candidates.filter(
    ({ priority, spot }) => priority === 'primary' && isOpenOn(spot, weekday),
  );
  const eligible =
    primary.length > 0
      ? primary
      : candidates.filter(
          ({ priority, spot }) => priority === 'supplement' && isOpenOn(spot, weekday),
        );
  return eligible.slice(0, START_CANDIDATES);
}

function createDayPlan(
  selectedPlan: MutablePlan,
  spots: Spot[],
  candidates: Candidate[],
  query: DayQuery,
  weekday: Weekday,
): DayPlan {
  const selectedIds = new Set(
    selectedPlan.items.filter(({ type }) => type === 'visit').map(({ spot }) => spot.id),
  );
  const excluded: ExcludedSpot[] = candidates
    .filter(({ spot }) => !selectedIds.has(spot.id))
    .map(({ spot }) => ({
      spot: toSpotSummary(spot),
      reason: isOpenOn(spot, weekday) ? 'NOT_ENOUGH_TIME' : 'CLOSED_ON_DAY',
    }));
  const stayMinutes = selectedPlan.items.reduce(
    (total, item) => total + toMinutes(item.leaveAt) - toMinutes(item.arriveAt),
    0,
  );
  const travelMinutesTotal = selectedPlan.items.reduce(
    (total, item) => total + item.travelMinutes,
    0,
  );
  const endAt = selectedPlan.items[selectedPlan.items.length - 1]?.leaveAt ?? query.start;
  const startMinute = toMinutes(query.start);
  const endMinute = toMinutes(query.end);

  return {
    conditions: {
      ...query,
      tags: [...query.tags],
      exclude: [...query.exclude],
      weekday,
    },
    items: selectedPlan.items,
    excluded,
    totals: {
      visitCount: selectedPlan.items.filter(({ type }) => type === 'visit').length,
      stayMinutes,
      travelMinutes: travelMinutesTotal,
      startAt: query.start,
      endAt,
      slackMinutes: endMinute - startMinute - stayMinutes - travelMinutesTotal,
    },
    notices: [...selectedPlan.notices],
  };
}

export function planDay(spots: Spot[], query: DayQuery): DayPlan {
  const weekday = weekdayOf(query.date);
  const candidates = scoreCandidates(spots, query);
  const startingCandidates = getStartingCandidates(candidates, weekday);
  const starts: (Candidate | undefined)[] =
    startingCandidates.length > 0 ? startingCandidates : [undefined];
  const plans = starts.map((startingCandidate) =>
    runDayPlan(spots, query, candidates, startingCandidate),
  );
  const selectedPlan = plans.sort(comparePlans)[0];

  if (!selectedPlan) {
    throw new Error('일정 후보를 계산하지 못했어요.');
  }

  return createDayPlan(selectedPlan, spots, candidates, query, weekday);
}
