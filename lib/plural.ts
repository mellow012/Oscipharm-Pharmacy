export function pluralizeLabel(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
