import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
    AUTH_THROTTLE_SCOPES,
    cleanupAuthThrottleRows,
    getAuthThrottleSecret,
    getTrustedClientIp,
    hashAuthThrottleSubject,
    isAuthSubjectLocked,
    normalizeAuthEmail,
    recordAuthFailure,
    resetAuthEmailFailures,
} from "../features/auth/lib/auth-throttle";
import { shouldInvalidateSession } from "./session-stale";

const DUMMY_PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

async function recordFailedLogin(emailHash: string, ipHash: string | null) {
    await Promise.all([
        recordAuthFailure(prisma, AUTH_THROTTLE_SCOPES.email, emailHash),
        ...(ipHash ? [recordAuthFailure(prisma, AUTH_THROTTLE_SCOPES.ip, ipHash)] : []),
    ]);
    void cleanupAuthThrottleRows(prisma).catch((error) => console.error("Authentication throttle cleanup failed.", error));
}

// Extend the default session/user/JWT types so role + branchId are typed
// everywhere they're used (route guards, UI conditionals, etc).
declare module "next-auth" {
    interface User {
        id: string;
        role: "ADMIN" | "BRANCH_MANAGER" | "POS";
        branchId: string | null;
    }
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: "ADMIN" | "BRANCH_MANAGER" | "POS";
            branchId: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: "ADMIN" | "BRANCH_MANAGER" | "POS";
        branchId: string | null;
        invalid?: boolean;
    }
}

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, request) {
                if (!credentials?.email || !credentials?.password) return null;
                let secret: string;
                try {
                    secret = getAuthThrottleSecret();
                } catch (error) {
                    console.error(error instanceof Error ? error.message : "AUTH_THROTTLE_SECRET is missing.");
                    throw error;
                }
                const email = normalizeAuthEmail(credentials.email);
                const emailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.email, email, secret);
                const ip = request?.headers ? getTrustedClientIp(request.headers) : null;
                const ipHash = ip ? hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.ip, ip, secret) : null;
                const [emailLocked, ipLocked] = await Promise.all([
                    isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.email, emailHash),
                    ipHash ? isAuthSubjectLocked(prisma, AUTH_THROTTLE_SCOPES.ip, ipHash) : Promise.resolve(false),
                ]);
                if (emailLocked || ipLocked) return null;
                const user = await prisma.user.findUnique({
                    where: { email },
                });
                const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
                if (!user || !user.isActive || !valid) {
                    await recordFailedLogin(emailHash, ipHash);
                    return null;
                }
                await resetAuthEmailFailures(prisma, emailHash);

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    branchId: user.branchId,
                };
            },
        }),
    ],
    callbacks: {
        // Persist role + branchId onto the JWT at sign-in
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.branchId = user.branchId;
                token.invalid = false;
                return token;
            }

            if (token.invalid) return token;

            if (!token.id) {
                token.invalid = true;
                return token;
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: token.id },
                select: { id: true, isActive: true, passwordChangedAt: true, role: true, branchId: true },
            });
            if (!currentUser) {
                token.invalid = true;
                return token;
            }
            if (shouldInvalidateSession({
                exists: true,
                isActive: currentUser.isActive,
                iat: typeof token.iat === "number" ? token.iat : undefined,
                passwordChangedAt: currentUser.passwordChangedAt,
            })) {
                token.invalid = true;
                return token;
            }
            token.role = currentUser.role;
            token.branchId = currentUser.branchId;
            token.invalid = false;
            return token;
        },
        // Expose role + branchId on the session object used client- and server-side
        async session({ session, token }) {
            if (token.invalid) {
                return { ...session, user: undefined } as unknown as typeof session;
            }
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.branchId = token.branchId;
            return session;
        },
    },
};