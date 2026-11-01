export const TAGS = ['nature', 'history', 'experience', 'food', 'photo'] as const;
export type Tag = (typeof TAGS)[number];

export const TAG_LABELS: Record<Tag, string> = {
  nature: '자연',
  history: '역사·문화',
  experience: '체험',
  food: '먹거리',
  photo: '사진 명소',
};

export const COMPANIONS = ['solo', 'couple', 'family', 'friends'] as const;
export type Companion = (typeof COMPANIONS)[number];

export const COMPANION_LABELS: Record<Companion, string> = {
  solo: '혼자',
  couple: '커플',
  family: '가족',
  friends: '친구',
};

export const KINDS = ['spot', 'restaurant', 'cafe'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABELS: Record<Kind, string> = {
  spot: '관광',
  restaurant: '식당',
  cafe: '카페',
};

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

export const MEALS = ['lunch', 'dinner'] as const;
export type Meal = (typeof MEALS)[number];

export const ZONES = [
  'cheongdo-eup',
  'hwayang-eup',
  'iseo-myeon',
  'gaknam-myeon',
  'punggak-myeon',
  'gakbuk-myeon',
  'unmun-myeon',
  'geumcheon-myeon',
  'maejeon-myeon',
] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABELS: Record<Zone, string> = {
  'cheongdo-eup': '청도읍',
  'hwayang-eup': '화양읍',
  'iseo-myeon': '이서면',
  'gaknam-myeon': '각남면',
  'punggak-myeon': '풍각면',
  'gakbuk-myeon': '각북면',
  'unmun-myeon': '운문면',
  'geumcheon-myeon': '금천면',
  'maejeon-myeon': '매전면',
};

export const TRAVEL = {
  roadFactor: 1.4,
  speedKmh: 40,
  overheadMinutes: 5,
  roundTo: 5,
} as const;

export const MEAL_WINDOWS = {
  lunch: { from: '11:30', to: '13:30' },
  dinner: { from: '17:30', to: '19:00' },
} as const;

export const MEAL_MINUTES = 60;

export const DAY_LIMITS = {
  startMin: '08:00',
  startMax: '14:00',
  endMax: '21:00',
  minSpanMinutes: 180,
  stepMinutes: 30,
  lunchStartMax: '12:00',
  lunchEndMin: '14:00',
  dinnerEndMin: '18:30',
} as const;

export const START_CANDIDATES = 5;
export const TRAVEL_WEIGHT = 0.5;
export const DATA_ATTRIBUTION = '데이터 제공: ⓒ한국관광공사';
