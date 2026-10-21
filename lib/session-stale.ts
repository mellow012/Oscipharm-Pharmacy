export function isSessionStale(iatSeconds: number | undefined, passwordChangedAt: Date | null): boolean {
    if (iatSeconds === undefined || passwordChangedAt === null) return false;
    return passwordChangedAt.getTime() > iatSeconds * 1000;
}