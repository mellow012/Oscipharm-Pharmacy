"use client";

import { useEffect, useRef, useState, useTransition, type InputHTMLAttributes } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildNextQueryString } from "@/features/shared/lib/query-string";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";
import { Search, X } from "lucide-react";

type Option = { value: string; label: string };

export function InPlaceFilter({
    name,
    label,
    value,
    options,
    preservedParams,
    debounceMs = 0,
    placeholder,
    controlClassName,
    submitClassName,
    clearable = false,
    inputAttributes,
}: {
    name: string;
    label: string;
    value: string;
    options?: Option[];
    preservedParams: Record<string, string | string[] | undefined>;
    debounceMs?: number;
    placeholder?: string;
    controlClassName?: string;
    submitClassName?: string;
    clearable?: boolean;
    inputAttributes?: Pick<InputHTMLAttributes<HTMLInputElement>, "enterKeyHint" | "autoComplete" | "autoCorrect" | "spellCheck">;
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
                    <div className="relative">
                        {clearable ? <Search aria-hidden="true" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" /> : null}
                        <FormInput
                            {...fieldProps}
                            {...inputAttributes}
                            className={`${controlClassName ?? fieldProps.className}${clearable ? " pl-12 pr-12" : ""}`}
                            type="search"
                            name={name}
                            value={currentValue}
                            placeholder={placeholder}
                            onChange={(event) => setCurrentValue(event.target.value)}
                        />
                        {clearable && currentValue ? (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                    setCurrentValue("");
                                    apply("");
                                }}
                                className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-on-surface-variant hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                                <X aria-hidden="true" size={19} />
                            </button>
                        ) : null}
                    </div>
                )}
            </FormField>
            <noscript>
                <button type="submit" className={submitClassName ?? "min-h-[42px] border border-primary px-space-md font-label-sm text-label-sm text-primary hover:bg-primary-fixed/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"}>Search</button>
            </noscript>
            <span aria-live="polite" className="min-h-5 self-center font-body-sm text-body-sm text-on-surface-variant">{isPending ? "Updating…" : ""}</span>
        </form>
    );
}