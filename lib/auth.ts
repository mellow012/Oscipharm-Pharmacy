import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });
                if (!user) return null;

                const valid = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!valid) return null;

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
            }
            return token;
        },
        // Expose role + branchId on the session object used client- and server-side
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.branchId = token.branchId;
            return session;
        },
    },
};