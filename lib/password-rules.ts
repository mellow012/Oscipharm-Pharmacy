export function getNewPasswordRules(password: string) {
    const byteLength = new TextEncoder().encode(password).length;
    return {
        minimumLength: password.length >= 10,
        maximumBytes: byteLength <= 72,
        valid: password.length >= 10 && byteLength <= 72,
    };
}

export function isValidNewPasswordValue(password: string): boolean {
    return getNewPasswordRules(password).valid;
}