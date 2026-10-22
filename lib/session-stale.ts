export function isSessionStale(iatSeconds: number | undefined, passwordChangedAt: Date | null): boolean {
    if (iatSeconds === undefined || passwordChangedAt === null) return false;
    return passwordChangedAt.getTime() > iatSeconds * 1000;
}

export function shouldInvalidateSession({
    exists,
    isActive,
    iat,
    passwordChangedAt,
}: {
    exists: boolean;
    isActive: boolean;
    iat: number | undefined;
    passwordChangedAt: Date | null;
}): boolean {
    return !exists || !isActive || isSessionStale(iat, passwordChangedAt);
}