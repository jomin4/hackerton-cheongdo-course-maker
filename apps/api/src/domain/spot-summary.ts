import type { Spot, SpotSummary } from '@cheongdo/shared';

export function toSpotSummary(spot: Spot): SpotSummary {
  const image = spot.images[0];

  return {
    id: spot.id,
    kind: spot.kind,
    name: spot.name,
    summary: spot.summary,
    zone: spot.zone,
    tags: [...spot.tags],
    stayMinutes: spot.stayMinutes,
    location: { ...spot.location },
    ...(image ? { image: { ...image } } : {}),
  };
}
