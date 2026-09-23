import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Path-prefix -> roles allowed. Checked top-to-bottom, first match wins.
// This is the coarse gate (keeps someone with a POS login from even loading
// the inventory pages); fine-grained per-action checks still happen with
// `can()` / `canOnBranch()` inside the actual route handlers.
const ROUTE_RULES: { prefix: string; roles: string[] }[] = [
    { prefix: "/admin", roles: ["ADMIN"] },
    { prefix: "/inventory", roles: ["ADMIN", "BRANCH_MANAGER"] },
    { prefix: "/pos", roles: ["ADMIN", "BRANCH_MANAGER", "POS"] },
    { prefix: "/reports", roles: ["ADMIN", "BRANCH_MANAGER"] },
    // /staff is the shared landing after login for every role — no role
    // restriction here, just requires a session (enforced by `authorized`
    // below). Per-role visibility is handled by HomeDashboard filtering
    // which cards to show, not by blocking the page itself.
    { prefix: "/staff", roles: ["ADMIN", "BRANCH_MANAGER", "POS"] },
];

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const role = req.nextauth.token?.role as string | undefined;

        const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
        if (rule && (!role || !rule.roles.includes(role))) {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // Just confirms a session exists; the role check above handles the rest.
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/admin/:path*",
        "/inventory/:path*",
        "/pos/:path*",
        "/reports/:path*",
        "/staff/:path*",
    ],
};