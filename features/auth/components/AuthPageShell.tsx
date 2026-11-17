"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function AuthPageShell({
    title,
    description,
    children,
    eyebrow = "OsciPharm staff",
}: {
    title: string;
    description?: string;
    children: ReactNode;
    eyebrow?: string;
}) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    return (
        <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-4 py-8 sm:px-6 sm:py-12">
            <section className="w-full max-w-md border border-outline-variant bg-surface-container-lowest px-5 py-7 shadow-modal sm:px-8 sm:py-9">
                <Link href="/" aria-label="OsciPharm home" className="mb-7 inline-flex min-h-11 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={126} height={50} priority className="h-10 w-auto object-contain object-left" />
                </Link>
                <header className="mb-7 border-b border-outline-variant pb-5">
                    <p className="font-eyebrow text-eyebrow uppercase text-secondary">{eyebrow}</p>
                    <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-headline-lg text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{title}</h1>
                    {description ? <p className="mt-3 text-body-md text-on-surface-variant">{description}</p> : null}
                </header>
                {children}
                <Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 font-label-md text-label-md text-on-surface-variant underline-offset-4 hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <ArrowLeft aria-hidden="true" size={16} />Back to OsciPharm
                </Link>
            </section>
        </main>
    );
}