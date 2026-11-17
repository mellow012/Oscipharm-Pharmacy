import { revalidateTag, updateTag } from "next/cache";

export const STAFF_NOTIFICATIONS_CACHE_TAG = "staff-notifications";

export function updateStaffNotificationsTag() {
	updateTag(STAFF_NOTIFICATIONS_CACHE_TAG);
}

export function revalidateStaffNotificationsTag() {
	revalidateTag(STAFF_NOTIFICATIONS_CACHE_TAG, { expire: 0 });
}