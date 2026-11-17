import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { NotificationsContent } from "@/features/notifications/components/NotificationsContent";
import { buildNotifications } from "@/features/notifications/lib/notification-rules";
import { getNotificationState, getNotificationsForPage } from "@/features/notifications/lib/queries";

export default async function StaffNotificationsPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id || !user.role) redirect("/login");

    const state = await getNotificationState(user.id);
    if (!state.available) {
        return (
            <div className="space-y-6 py-6 sm:py-8">
                <PageHeader eyebrow="Workspace" title="Notifications" description="Items that need attention and recent staff activity." />
                <NoticeBanner tone="info" title="Notifications are not available yet">
                    Notification storage could not be read. The reviewed migration may still need to be applied, or the database may be temporarily unavailable.
                </NoticeBanner>
            </div>
        );
    }

    const sources = await getNotificationsForPage(user.role, user.branchId ?? null);
    const { attention, activity } = buildNotifications(user.role, user.branchId ?? null, sources);
    return <NotificationsContent attention={attention} activity={activity} seenAt={state.seenAt} />;
}