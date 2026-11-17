"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { PasswordRules } from "@/features/auth/components/PasswordRules";

export function PasswordField({
    id,
    label,
    value,
    onChange,
    onValueChange,
    error,
    required = true,
    newPassword = false,
    showRules = newPassword,
}: {
    id: string;
    label: string;
    value?: string;
    onChange?: (value: string) => void;
    onValueChange?: (value: string) => void;
    error?: string;
    required?: boolean;
    newPassword?: boolean;
    showRules?: boolean;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <FormField id={id} label={label} required={required} error={error}>
            {(props) => (
                <>
                    <div className="mt-space-xs flex min-w-0 items-stretch rounded border border-outline-variant bg-surface-container-lowest focus-within:border-primary">
                        <FormInput
                            {...props}
                            name={id}
                            type={visible ? "text" : "password"}
                            autoComplete={newPassword ? "new-password" : "current-password"}
                            autoCapitalize="off"
                            spellCheck={false}
                            minLength={newPassword ? 10 : undefined}
                            value={onChange ? value ?? "" : undefined}
                            onChange={(event) => {
                                onChange?.(event.target.value);
                                onValueChange?.(event.target.value);
                            }}
                            className="min-w-0 min-h-11 flex-1 border-0 bg-transparent px-space-sm text-body-sm focus:border-0 focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        />
                        <button
                            type="button"
                            aria-label={visible ? "Hide password" : "Show password"}
                            aria-pressed={visible}
                            onClick={() => setVisible((current) => !current)}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                        </button>
                    </div>
                    {showRules ? <PasswordRules password={value ?? ""} id={`${id}-rules`} /> : null}
                </>
            )}
        </FormField>
    );
}