export const BCRYPT_PASSWORD_COST = 10;

export function isValidNewPassword(password: string) {
    const byteLength = Buffer.byteLength(password, "utf8");
    return password.length >= 10 && byteLength <= 72;
}