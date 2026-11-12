"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
    children: React.ReactNode;
    className?: string;
};

export function SubmitButton({ children, className = "" }: SubmitButtonProps) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait disabled:opacity-60`}>
            {pending ? "Working..." : children}
        </button>
    );
}
