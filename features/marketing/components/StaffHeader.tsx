"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function StaffHeader() {
    return (
        <nav className="flex items-center justify-between gap-4 border-b border-border pb-5">
            <Link href="/staff" className="font-mono text-xs uppercase tracking-[0.14em] text-warn transition hover:text-primary">
                OsciPharm staff
            </Link>

            <div className="flex items-center gap-3">
                <Link href="/" className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted transition hover:text-primary">
                    Public site
                </Link>
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="border border-border px-2.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted transition hover:border-primary hover:text-primary"
                >
                    Sign out
                </button>
            </div>
        </nav>
    );
}
