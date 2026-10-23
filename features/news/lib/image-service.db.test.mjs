import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { databaseTarget, requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { attachImage, deleteImage, moveImage } from "./image-service.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
assert.ok(process.env.DATABASE_URL, "DB test must run via npm run test:db");
assert.equal(databaseTarget(process.env.DATABASE_URL), databaseTarget(testDatabaseUrl), "DB test must run via npm run test:db");
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

function createFakeStorage() {
    const objects = new Map();
    const state = { configured: true, failUpload: false, failRemove: false, removeCalls: 0, uploadCalls: 0 };
    return {
        objects,
        state,
        isConfigured: () => state.configured,
        async upload(path, bytes, contentType) {
            state.uploadCalls += 1;
            if (state.failUpload) return { ok: false, reason: "upload failed" };
            objects.set(path, { bytes: Uint8Array.from(bytes), contentType });
            return { ok: true, url: `https://storage.test/storage/v1/object/public/news-images/${path}` };
        },
        async remove(path) {
            state.removeCalls += 1;
            if (state.failRemove) return { ok: false, reason: "remove failed" };
            if (!objects.has(path)) return { ok: true };
            objects.delete(path);
            return { ok: true };
        },
    };
}

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);

test("image service enforces limits, ownership, cleanup, ordering and audit privacy", async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const branch = await prisma.branch.create({ data: { name: `News image test ${suffix}` } });
    const admin = await prisma.user.create({ data: { name: "Image Admin", email: `image-admin-${suffix}@example.test`, passwordHash: "test", role: "ADMIN" } });
    const managerA = await prisma.user.create({ data: { name: "Image Manager A", email: `image-manager-a-${suffix}@example.test`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id } });
    const managerB = await prisma.user.create({ data: { name: "Image Manager B", email: `image-manager-b-${suffix}@example.test`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id } });
    const inactive = await prisma.user.create({ data: { name: "Inactive Image Manager", email: `image-inactive-${suffix}@example.test`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id, isActive: false } });
    const postA = await prisma.news.create({ data: { title: "Manager A Post", slug: `image-a-${suffix}`, body: "Body", createdById: managerA.id } });
    const postB = await prisma.news.create({ data: { title: "Manager B Post", slug: `image-b-${suffix}`, body: "Body", createdById: managerB.id } });
    const concurrentPost = await prisma.news.create({ data: { title: "Concurrent Post", slug: `image-c-${suffix}`, body: "Body", createdById: managerA.id } });
    const uploadFailurePost = await prisma.news.create({ data: { title: "Upload Failure Post", slug: `image-f-${suffix}`, body: "Body", createdById: managerA.id } });
    const storage = createFakeStorage();
    const owned = { prisma, storage, actorId: managerA.id, bytes: jpegBytes, altText: "", caption: "" };

    try {
        const imagesA = [];
        for (let index = 0; index < 8; index += 1) {
            const result = await attachImage({ ...owned, postId: postA.id, altText: `Image ${index}` });
            assert.equal(result.ok, true);
            if (result.ok) imagesA.push(result.data.image);
        }
        const countBeforeNinth = storage.objects.size;
        const ninth = await attachImage({ ...owned, postId: postA.id });
        assert.equal(ninth.ok, false);
        assert.equal(storage.objects.size, countBeforeNinth);

        for (let index = 0; index < 7; index += 1) {
            assert.equal((await attachImage({ ...owned, postId: concurrentPost.id })).ok, true);
        }
        const beforeConcurrent = storage.objects.size;
        const removesBeforeConcurrent = storage.state.removeCalls;
        const concurrentResults = await Promise.all([
            attachImage({ ...owned, postId: concurrentPost.id }),
            attachImage({ ...owned, postId: concurrentPost.id }),
        ]);
        assert.equal(concurrentResults.filter((result) => result.ok).length, 1);
        assert.equal(await prisma.newsImage.count({ where: { newsId: concurrentPost.id } }), 8);
        assert.equal(storage.objects.size, beforeConcurrent + 1);
        assert.equal(storage.state.removeCalls, removesBeforeConcurrent + 1);

        const deniedCrossOwner = await attachImage({ ...owned, postId: postB.id });
        assert.equal(deniedCrossOwner.ok, false);
        const adminAdded = await attachImage({ ...owned, actorId: admin.id, postId: postB.id });
        assert.equal(adminAdded.ok, true);
        const inactiveDenied = await attachImage({ ...owned, actorId: inactive.id, postId: postA.id });
        assert.equal(inactiveDenied.ok, false);

        storage.state.failUpload = true;
        const beforeFailedUpload = await prisma.newsImage.count({ where: { newsId: uploadFailurePost.id } });
        assert.equal((await attachImage({ ...owned, postId: uploadFailurePost.id })).ok, false);
        assert.equal(await prisma.newsImage.count({ where: { newsId: uploadFailurePost.id } }), beforeFailedUpload);
        storage.state.failUpload = false;

        const unconfiguredStorage = createFakeStorage();
        unconfiguredStorage.state.configured = false;
        const beforeUnconfiguredRows = await prisma.newsImage.count({ where: { newsId: uploadFailurePost.id } });
        const unconfiguredResult = await attachImage({ ...owned, storage: unconfiguredStorage, postId: uploadFailurePost.id });
        assert.deepEqual(unconfiguredResult, { ok: false, message: "Image storage is not configured.", status: 503 });
        assert.equal(await prisma.newsImage.count({ where: { newsId: uploadFailurePost.id } }), beforeUnconfiguredRows);
        assert.equal(unconfiguredStorage.state.uploadCalls, 0);

        const removeFailImage = imagesA[0];
        const removeFailPath = (await prisma.newsImage.findUnique({ where: { id: removeFailImage.id }, select: { storagePath: true } })).storagePath;
        assert.ok(removeFailPath);
        storage.state.failRemove = true;
        const removedWithFailure = await deleteImage({ prisma, storage, actorId: managerA.id, imageId: removeFailImage.id });
        assert.equal(removedWithFailure.ok, true);
        assert.equal(await prisma.newsImage.findUnique({ where: { id: removeFailImage.id } }), null);
        assert.ok(storage.objects.has(removeFailPath));
        storage.state.failRemove = false;

        const missingObjectImage = imagesA[1];
        const missingObjectPath = (await prisma.newsImage.findUnique({ where: { id: missingObjectImage.id }, select: { storagePath: true } })).storagePath;
        assert.ok(missingObjectPath);
        assert.ok(storage.objects.has(missingObjectPath));
        storage.objects.delete(missingObjectPath);
        assert.equal(storage.objects.has(missingObjectPath), false);
        assert.equal((await deleteImage({ prisma, storage, actorId: managerA.id, imageId: missingObjectImage.id })).ok, true);
        assert.equal(await prisma.newsImage.findUnique({ where: { id: missingObjectImage.id } }), null);

        const legacyImage = await prisma.newsImage.create({
            data: { newsId: postA.id, url: "https://legacy.test/image.jpg", storagePath: null, sortOrder: 20 },
        });
        const removeCallsBeforeLegacy = storage.state.removeCalls;
        assert.equal((await deleteImage({ prisma, storage, actorId: managerA.id, imageId: legacyImage.id })).ok, true);
        assert.equal(await prisma.newsImage.findUnique({ where: { id: legacyImage.id } }), null);
        assert.equal(storage.state.removeCalls, removeCallsBeforeLegacy);

        const currentRows = await prisma.newsImage.findMany({ where: { newsId: concurrentPost.id }, orderBy: { sortOrder: "asc" } });
        const moved = currentRows[currentRows.length - 1];
        assert.equal((await moveImage({ prisma, actorId: managerA.id, imageId: moved.id, direction: "up" })).ok, true);
        const reordered = await prisma.newsImage.findMany({ where: { newsId: concurrentPost.id }, orderBy: { sortOrder: "asc" } });
        assert.deepEqual(reordered.map((row) => row.sortOrder), [0, 1, 2, 3, 4, 5, 6, 7]);
        assert.equal(reordered[6].id, moved.id);

        const auditRows = await prisma.auditLog.findMany({ where: { userId: { in: [admin.id, managerA.id, managerB.id] }, action: "NEWS_UPDATED" }, select: { details: true } });
        assert.ok(auditRows.length > 0);
        assert.ok(auditRows.every(({ details }) => {
            const serialized = JSON.stringify(details);
            return !serialized.includes("https://") && !serialized.toLowerCase().includes("service_role");
        }));
    } finally {
        await prisma.news.deleteMany({ where: { id: { in: [postA.id, postB.id, concurrentPost.id, uploadFailurePost.id] } } });
        await prisma.auditLog.deleteMany({ where: { userId: { in: [admin.id, managerA.id, managerB.id, inactive.id] } } });
        await prisma.user.deleteMany({ where: { id: { in: [admin.id, managerA.id, managerB.id, inactive.id] } } });
        await prisma.branch.delete({ where: { id: branch.id } });
    }
});

test.after(async () => prisma.$disconnect());