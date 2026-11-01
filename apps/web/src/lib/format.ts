export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}분`;
  if (remainingMinutes === 0) return `${hours}시간`;
  return `${hours}시간 ${remainingMinutes}분`;
}

export function formatTimeRange(from: string, to: string): string {
  return `${from}–${to}`;
}

export function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = String(minutes % 60).padStart(2, '0');
  return `${hours}:${remainingMinutes}`;
}
