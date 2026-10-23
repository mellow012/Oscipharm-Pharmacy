import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorage } from "@/lib/supabase-storage";
import { attachImage } from "@/features/news/lib/image-service";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = Math.floor(4.6 * 1024 * 1024);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return Response.json({ ok: false, message: "Sign in required." }, { status: 401 });

        const contentLength = Number(request.headers.get("content-length"));
        if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
            return Response.json({ ok: false, message: "The upload is too large." }, { status: 413 });
        }

        const { id: postId } = await params;
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) return Response.json({ ok: false, message: "Choose an image file." }, { status: 400 });
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await attachImage({
            prisma,
            storage: createStorage(),
            actorId: session.user.id,
            postId,
            bytes,
            altText: formData.get("altText"),
            caption: formData.get("caption"),
        });
        if (!result.ok) return Response.json({ ok: false, message: result.message }, { status: result.status });

        revalidatePath("/news");
        revalidatePath(`/news/${result.data.slug}`);
        revalidatePath("/staff/news");
        revalidatePath(`/staff/news/${postId}/preview`);
        revalidatePath(`/staff/news/${postId}/edit`);
        return Response.json({ ok: true, message: result.message, image: result.data.image });
    } catch {
        return Response.json({ ok: false, message: "Image upload could not be completed." }, { status: 500 });
    }
}