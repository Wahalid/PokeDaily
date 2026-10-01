export function formatDexNumber(dex: number): string {
  return `#${String(dex).padStart(4, "0")}`;
}
