import nodemailer from "nodemailer";

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM;

    if (!host || !from) {
        if (process.env.NODE_ENV !== "production") {
            console.log(`Password reset email preview for ${to}:\n${text}`);
        } else {
            console.error("SMTP not configured; password reset email not sent");
        }
        return;
    }

    const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: user && password ? { user, pass: password } : undefined,
    });

    try {
        await transport.sendMail({ from, to, subject, text });
    } catch (error) {
        const details = error as { code?: unknown; responseCode?: unknown; command?: unknown };
        console.error("SMTP send failed", {
            code: details?.code,
            responseCode: details?.responseCode,
            command: details?.command,
        });
        throw error;
    }
}