import { TRAVEL } from '@cheongdo/shared';

const EARTH_RADIUS_KM = 6371;
const DEGREES_TO_RADIANS = Math.PI / 180;
const MINUTES_PER_HOUR = 60;

interface Coordinates {
  lat: number;
  lng: number;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const latitudeDifference = (b.lat - a.lat) * DEGREES_TO_RADIANS;
  const longitudeDifference = (b.lng - a.lng) * DEGREES_TO_RADIANS;
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(a.lat * DEGREES_TO_RADIANS) *
      Math.cos(b.lat * DEGREES_TO_RADIANS) *
      Math.sin(longitudeDifference / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function travelMinutes(km: number): number {
  if (km === 0) {
    return 0;
  }

  const rawMinutes =
    (km * TRAVEL.roadFactor * MINUTES_PER_HOUR) / TRAVEL.speedKmh + TRAVEL.overheadMinutes;
  return Math.ceil(rawMinutes / TRAVEL.roundTo) * TRAVEL.roundTo;
}
