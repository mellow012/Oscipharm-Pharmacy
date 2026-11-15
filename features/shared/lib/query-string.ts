export function buildNextQueryString(currentSearch: string, key: string, value: string) {
    const params = new URLSearchParams(currentSearch);
    if (value) params.set(key, value);
    else params.delete(key);
    return params.toString();
}