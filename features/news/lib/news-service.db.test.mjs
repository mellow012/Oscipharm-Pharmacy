import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { databaseTarget, requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";
import { publicNewsWhere } from "./news-rules.ts";
import { createNewsPost, deleteNewsPost, publishNewsPost, unpublishNewsPost, updateNewsPost } from "./news-service.ts";

const testDatabaseUrl = requireTestDatabaseUrl();
assert.ok(process.env.DATABASE_URL, "DB test must run via npm run test:db");
assert.equal(databaseTarget(process.env.DATABASE_URL), databaseTarget(testDatabaseUrl), "DB test must run via npm run test:db");
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

test("news service enforces ownership, lifecycle, audit, and event constraints", async () => {
    const branch = await prisma.branch.create({ data: { name: `News service test ${Date.now()}` } });
    const users = await Promise.all([
        prisma.user.create({ data: { name: "News Admin", email: `news-admin-${Date.now()}@example.test`, passwordHash: "test", role: "ADMIN" } }),
        prisma.user.create({ data: { name: "News Manager A", email: `news-manager-a-${Date.now()}@example.test`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id } }),
        prisma.user.create({ data: { name: "News Manager B", email: `news-manager-b-${Date.now()}@example.test`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id } }),
        prisma.user.create({ data: { name: "Inactive News Manager", email: `news-inactive-${Date.now()}@example.test`, passwordHash: "test", role: "BRANCH_MANAGER", branchId: branch.id, isActive: false } }),
        prisma.user.create({ data: { name: "News POS", email: `news-pos-${Date.now()}@example.test`, passwordHash: "test", role: "POS", branchId: branch.id } }),
    ]);
    const [admin, managerA, managerB, inactive, pos] = users;
    const createdIds = [];

    try {
        const created = await createNewsPost(managerA.id, { title: "Round A News", type: "NEWS", excerpt: "", body: "Original body" });
        assert.equal(created.ok, true);
        if (!created.ok) return;
        createdIds.push(created.data.id);

        const initialPost = await prisma.news.findUniqueOrThrow({ where: { id: created.data.id } });
        assert.equal(initialPost.status, "PREVIEW");
        const createAudit = await prisma.auditLog.findFirstOrThrow({ where: { userId: managerA.id, action: "NEWS_CREATED" } });
        assert.equal(createAudit.branchId, branch.id);
        assert.deepEqual(createAudit.details, { newsId: created.data.id, slug: created.data.slug, title: "Round A News", type: "NEWS" });

        const concurrent = await Promise.all([
            createNewsPost(managerA.id, { title: "Same Concurrent Title", type: "NEWS", excerpt: "", body: "A" }),
            createNewsPost(managerA.id, { title: "Same Concurrent Title", type: "NEWS", excerpt: "", body: "B" }),
        ]);
        assert.ok(concurrent.every((result) => result.ok));
        for (const result of concurrent) if (result.ok) createdIds.push(result.data.id);
        assert.equal(new Set(concurrent.flatMap((result) => result.ok ? [result.data.slug] : [])).size, 2);

        const auditsBeforeDenied = await prisma.auditLog.count({ where: { userId: managerB.id } });
        assert.equal((await updateNewsPost(managerB.id, created.data.id, { title: "Tampered", type: "NEWS", excerpt: "", body: "Tampered" })).ok, false);
        assert.equal((await publishNewsPost(managerB.id, created.data.id)).ok, false);
        assert.equal((await deleteNewsPost(managerB.id, created.data.id)).ok, false);
        assert.equal(await prisma.auditLog.count({ where: { userId: managerB.id } }), auditsBeforeDenied);
        assert.equal((await prisma.news.findUniqueOrThrow({ where: { id: created.data.id } })).body, "Original body");
        assert.equal((await createNewsPost(inactive.id, { title: "Inactive", type: "NEWS", excerpt: "", body: "No" })).ok, false);
        assert.equal((await createNewsPost(pos.id, { title: "POS", type: "NEWS", excerpt: "", body: "No" })).ok, false);

        const eventWithoutStart = await createNewsPost(managerA.id, { title: "Invalid Event", type: "EVENT", excerpt: "", body: "Body", eventStartsAt: "" });
        assert.equal(eventWithoutStart.ok, false);
        await assert.rejects(prisma.news.create({
            data: { title: "DB invalid event", slug: `db-invalid-event-${Date.now()}`, body: "Body", createdById: managerA.id, type: "EVENT" },
        }));
        await assert.rejects(prisma.news.create({
            data: {
                title: "DB reversed event",
                slug: `db-reversed-event-${Date.now()}`,
                body: "Body",
                createdById: managerA.id,
                type: "EVENT",
                eventStartsAt: new Date("2026-10-22T10:00:00Z"),
                eventEndsAt: new Date("2026-10-22T09:00:00Z"),
            },
        }));

        const event = await createNewsPost(managerA.id, {
            title: "Published event",
            type: "EVENT",
            excerpt: "",
            body: "Event body",
            eventStartsAt: "2026-10-22T12:00",
            eventEndsAt: "2026-10-22T13:00",
            eventLocation: "Blantyre",
        });
        assert.equal(event.ok, true);
        if (!event.ok) return;
        createdIds.push(event.data.id);
        await publishNewsPost(managerA.id, event.data.id);

        const published = await createNewsPost(managerA.id, { title: "Public filter", type: "NEWS", excerpt: "", body: "Public" });
        assert.equal(published.ok, true);
        if (!published.ok) return;
        createdIds.push(published.data.id);
        await publishNewsPost(managerA.id, published.data.id);
        const publicRows = await prisma.news.findMany({ where: publicNewsWhere("NEWS"), select: { id: true, type: true, status: true } });
        assert.ok(publicRows.some((post) => post.id === published.data.id));
        assert.ok(publicRows.every((post) => post.status === "PUBLISHED" && post.type === "NEWS"));
        assert.ok(!publicRows.some((post) => createdIds.includes(post.id) && post.id !== published.data.id));

        const adminUpdate = await updateNewsPost(admin.id, created.data.id, { title: "Admin edited", type: "EVENT", excerpt: "", body: "Edited body" });
        assert.equal(adminUpdate.ok, true);
        const publishedByAdmin = await publishNewsPost(admin.id, created.data.id);
        assert.equal(publishedByAdmin.ok, true);
        const publishedAt = (await prisma.news.findUniqueOrThrow({ where: { id: created.data.id } })).publishedAt;
        const afterPublishedEdit = await updateNewsPost(admin.id, created.data.id, { title: "Admin edited again", type: "NEWS", excerpt: "Changed", body: "Updated body" });
        assert.equal(afterPublishedEdit.ok, true);
        const editedPost = await prisma.news.findUniqueOrThrow({ where: { id: created.data.id } });
        assert.equal(editedPost.type, "NEWS");
        assert.equal(editedPost.publishedAt.getTime(), publishedAt.getTime());
        await unpublishNewsPost(admin.id, created.data.id);
        const unpublished = await prisma.news.findUniqueOrThrow({ where: { id: created.data.id } });
        assert.equal(unpublished.status, "PREVIEW");
        assert.equal(unpublished.publishedAt.getTime(), publishedAt.getTime());

        const deleted = await deleteNewsPost(admin.id, created.data.id);
        assert.equal(deleted.ok, true);
        assert.equal(await prisma.news.findUnique({ where: { id: created.data.id } }), null);
        const deleteAudit = await prisma.auditLog.findFirstOrThrow({ where: { userId: admin.id, action: "NEWS_DELETED" } });
        assert.deepEqual(deleteAudit.details, { newsId: created.data.id, slug: created.data.slug, title: "Admin edited again", type: "NEWS" });
    } finally {
        await prisma.news.deleteMany({ where: { createdById: { in: users.map((user) => user.id) } } });
        await prisma.auditLog.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
        await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
        await prisma.branch.delete({ where: { id: branch.id } });
    }
});

test.after(async () => prisma.$disconnect());