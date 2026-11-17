import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays } from "lucide-react";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { NotificationsSeenControls } from "@/features/notifications/components/NotificationsSeenControls";
import { groupNotificationsByDay, type NotificationItem } from "@/features/notifications/lib/notification-rules";

function NotificationLink({ item, seenAt }: { item: NotificationItem; seenAt: Date | null }) {
    const isNew = item.occurredAt !== null && (!seenAt || item.occurredAt > seenAt);
    return (
        <li>
            <Link href={item.href} className="group flex min-h-16 min-w-0 items-start gap-3 border-b border-outline-variant px-3 py-3 text-on-surface hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-4">
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="font-label-md text-label-md font-semibold group-hover:text-primary">{item.title}</span>
                        {isNew ? <StatusBadge tone="neutral">New</StatusBadge> : null}
                    </span>
                    <span className="mt-1 block break-words font-body-sm text-body-sm text-on-surface-variant">{item.description}</span>
                    {item.branchName ? <span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">{item.branchName}</span> : null}
                </span>
                {item.occurredAt ? <time className="shrink-0 pt-0.5 font-body-sm text-body-sm text-on-surface-variant" dateTime={item.occurredAt.toISOString()}>{new Intl.DateTimeFormat("en-MW", { timeZone: "Africa/Blantyre", hour: "numeric", minute: "2-digit" }).format(item.occurredAt)}</time> : null}
                <ArrowUpRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-outline group-hover:text-primary" />
            </Link>
        </li>
    );
}

export function NotificationsContent({
    attention,
    activity,
    seenAt,
    controls = true,
    idPrefix = "notifications",
}: {
    attention: NotificationItem[];
    activity: NotificationItem[];
    seenAt: Date | null;
    controls?: boolean;
    idPrefix?: string;
}) {
    const activityByDay = groupNotificationsByDay(activity);
    return (
        <div className="space-y-7 py-6 sm:py-8">
            <PageHeader
                eyebrow="Workspace"
                title="Notifications"
                description="Items that need attention and recent staff activity."
                actions={controls ? <NotificationsSeenControls /> : undefined}
            />

            <section aria-labelledby={`${idPrefix}-needs-attention-heading`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Bell aria-hidden="true" size={18} className="text-secondary" />
                    <h2 id={`${idPrefix}-needs-attention-heading`} className="font-headline-md text-headline-md text-primary">Needs attention</h2>
                    {attention.length ? <StatusBadge tone="warning">{attention.length}</StatusBadge> : null}
                </div>
                {attention.length ? (
                    <ul className="divide-y divide-outline-variant border-y border-outline-variant">
                        {attention.map((item) => <NotificationLink key={item.id} item={item} seenAt={seenAt} />)}
                    </ul>
                ) : <p className="border-y border-outline-variant py-4 font-body-md text-body-md text-on-surface-variant">Nothing needs attention</p>}
            </section>

            <section aria-labelledby={`${idPrefix}-recent-activity-heading`}>
                <div className="mb-3 flex items-center gap-2">
                    <CalendarDays aria-hidden="true" size={18} className="text-secondary" />
                    <h2 id={`${idPrefix}-recent-activity-heading`} className="font-headline-md text-headline-md text-primary">Recent activity</h2>
                </div>
                {activityByDay.length ? (
                    <div className="space-y-5">
                        {activityByDay.map((group) => (
                            <section key={group.key} aria-labelledby={`${idPrefix}-activity-${group.key}`}>
                                <h3 id={`${idPrefix}-activity-${group.key}`} className="mb-2 font-label-md text-label-md font-semibold text-on-surface-variant">{group.label}</h3>
                                <ul className="divide-y divide-outline-variant border-y border-outline-variant">
                                    {group.items.map((item) => <NotificationLink key={item.id} item={item} seenAt={seenAt} />)}
                                </ul>
                            </section>
                        ))}
                    </div>
                ) : <p className="border-y border-outline-variant py-4 font-body-md text-body-md text-on-surface-variant">No recent activity</p>}
            </section>
        </div>
    );
}