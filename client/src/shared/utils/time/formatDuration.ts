export function seconds2MinutesSeconds(seconds: number): string {
  const remaining = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${(remaining % 60).toString().padStart(2, "0")}`;
}
