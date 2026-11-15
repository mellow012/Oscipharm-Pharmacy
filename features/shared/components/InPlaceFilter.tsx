"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildNextQueryString } from "@/features/shared/lib/query-string";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";

type Option = { value: string; label: string };

export function InPlaceFilter({
    name,
    label,
    value,
    options,
    preservedParams,
    debounceMs = 0,
    placeholder,
}: {
    name: string;
    label: string;
    value: string;
    options?: Option[];
    preservedParams: Record<string, string | string[] | undefined>;
    debounceMs?: number;
    placeholder?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [currentValue, setCurrentValue] = useState(value);
    const [isPending, startTransition] = useTransition();
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => setCurrentValue(value), [value]);

    function apply(nextValue: string) {
        const query = buildNextQueryString(searchParams.toString(), name, nextValue);
        const href = query ? `${pathname}?${query}` : pathname;
        if (href !== `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`) {
            startTransition(() => router.replace(href, { scroll: false }));
        }
    }

    useEffect(() => {
        if (!debounceMs || currentValue === value) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const query = buildNextQueryString(searchParams.toString(), name, currentValue);
            const href = query ? `${pathname}?${query}` : pathname;
            startTransition(() => router.replace(href, { scroll: false }));
        }, debounceMs);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [currentValue, debounceMs, name, pathname, router, searchParams, value]);

    return (
        <form method="get" action={pathname} className="flex min-w-0 flex-wrap items-end gap-space-sm">
            {Object.entries(preservedParams).flatMap(([key, preserved]) => {
                if (key === name || preserved === undefined) return [];
                return (Array.isArray(preserved) ? preserved : [preserved]).map((item, index) => (
                    <input key={`${key}-${index}`} type="hidden" name={key} value={item} />
                ));
            })}
            <FormField id={`filter-${name}`} label={label}>
                {(fieldProps) => options ? (
                    <FormSelect
                        {...fieldProps}
                        name={name}
                        value={currentValue}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setCurrentValue(nextValue);
                            apply(nextValue);
                        }}
                    >
                        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </FormSelect>
                ) : (
                    <FormInput
                        {...fieldProps}
                        type="search"
                        name={name}
                        value={currentValue}
                        placeholder={placeholder}
                        onChange={(event) => setCurrentValue(event.target.value)}
                    />
                )}
            </FormField>
            <button type="submit" className="min-h-[42px] border border-primary px-space-md font-label-sm text-label-sm text-primary hover:bg-primary-fixed/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Apply</button>
            <span aria-live="polite" className="min-h-5 self-center font-body-sm text-body-sm text-on-surface-variant">{isPending ? "Updating…" : ""}</span>
        </form>
    );
}