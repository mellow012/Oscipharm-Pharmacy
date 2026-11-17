import { Check, Circle } from "lucide-react";
import { getNewPasswordRules } from "@/lib/password-rules";

export function PasswordRules({ password, id }: { password: string; id: string }) {
    const rules = getNewPasswordRules(password);

    return (
        <ul id={id} className="mt-2 space-y-1 text-body-sm text-on-surface-variant" aria-label="Password requirements">
            <li className="flex items-center gap-2">
                {rules.minimumLength ? <Check aria-hidden="true" size={15} className="text-status-success" /> : <Circle aria-hidden="true" size={15} />}
                At least 10 characters
            </li>
            <li className="flex items-center gap-2">
                {rules.maximumBytes ? <Check aria-hidden="true" size={15} className="text-status-success" /> : <Circle aria-hidden="true" size={15} />}
                No more than 72 UTF-8 bytes
            </li>
        </ul>
    );
}