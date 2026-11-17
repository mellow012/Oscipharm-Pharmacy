export function isValidPhoneNumber(value: string): boolean {
    return value.length >= 7 && value.length <= 20 && /^(?=.*\d)[0-9+() -]+$/.test(value);
}