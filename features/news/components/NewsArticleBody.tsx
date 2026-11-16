import type { ReactNode } from "react";

const LINK_PATTERN = /https?:\/\/[^\s<>"']+|\+265\d{9}\b|(?<![\d+])0\d{9}\b/gi;

function renderLinkedText(text: string, keyPrefix: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const match of text.matchAll(LINK_PATTERN)) {
        const start = match.index ?? 0;
        const matchedText = match[0];
        let linkText = matchedText;
        let trailingText = "";
        if (/^https?:/i.test(matchedText)) {
            while (/[.,!?;:)}\]]$/.test(linkText)) {
                trailingText = linkText.slice(-1) + trailingText;
                linkText = linkText.slice(0, -1);
            }
        }

        if (start > cursor) parts.push(text.slice(cursor, start));
        if (/^https?:/i.test(linkText)) {
            parts.push(
                <a key={`${keyPrefix}-${start}`} href={linkText} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
                    {linkText}
                </a>,
            );
        } else {
            parts.push(
                <a key={`${keyPrefix}-${start}`} href={`tel:${linkText}`} className="font-medium text-primary underline underline-offset-2">
                    {linkText}
                </a>,
            );
        }
        if (trailingText) parts.push(trailingText);
        cursor = start + matchedText.length;
    }

    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
}

export function NewsArticleBody({ body }: { body: string }) {
    return (
        <div className="mx-auto mt-8 w-full max-w-[68ch] space-y-5 text-body-lg leading-8 text-on-surface">
            {body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`paragraph-${index}`} className="whitespace-pre-wrap">
                    {renderLinkedText(paragraph, `text-${index}`)}
                </p>
            ))}
        </div>
    );
}