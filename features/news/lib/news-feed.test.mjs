import assert from "node:assert/strict";
import test from "node:test";
import { formatNewsDate } from "./news-dates.ts";
import { eventEffectiveEnd, isUpcomingEvent, normalizeTab, orderAll, orderPastEvents, orderUpcomingEvents } from "./news-feed.ts";

test("normalizeTab accepts only exact single News and Events values", () => {
    assert.equal(normalizeTab("news"), "news");
    assert.equal(normalizeTab("events"), "events");
    assert.equal(normalizeTab(undefined), "all");
    assert.equal(normalizeTab("NEWS"), "all");
    assert.equal(normalizeTab("foo"), "all");
    assert.equal(normalizeTab(["news"]), "all");
});

test("events without an end time remain upcoming through the end of their Blantyre start day", () => {
    const event = { eventStartsAt: new Date("2026-10-23T20:30:00.000Z"), eventEndsAt: null };
    assert.equal(eventEffectiveEnd(event)?.toISOString(), "2026-10-23T21:59:59.999Z");
    assert.equal(isUpcomingEvent(event, new Date("2026-10-23T21:59:00.000Z")), true);
    assert.equal(isUpcomingEvent(event, new Date("2026-10-23T21:59:59.999Z")), true);
    assert.equal(isUpcomingEvent(event, new Date("2026-10-23T22:00:00.000Z")), false);
});

test("an event ending exactly now is upcoming and one millisecond before now is past", () => {
    const event = { eventStartsAt: null, eventEndsAt: new Date("2026-10-23T21:00:00.000Z") };
    assert.equal(isUpcomingEvent(event, event.eventEndsAt), true);
    assert.equal(isUpcomingEvent(event, new Date(event.eventEndsAt.getTime() + 1)), false);
});

test("events without start and end times are not upcoming", () => {
    assert.equal(eventEffectiveEnd({ eventStartsAt: null, eventEndsAt: null }), null);
    assert.equal(isUpcomingEvent({ eventStartsAt: null, eventEndsAt: null }, new Date("2026-10-23T00:00:00.000Z")), false);
});

test("event and all-feed ordering is correct without mutating input arrays", () => {
    const upcoming = [
        { id: "later", eventStartsAt: new Date("2026-10-25T10:00:00.000Z"), eventEndsAt: null },
        { id: "sooner", eventStartsAt: new Date("2026-10-24T10:00:00.000Z"), eventEndsAt: null },
    ];
    const past = [
        { id: "older", eventStartsAt: new Date("2026-10-20T10:00:00.000Z"), eventEndsAt: null },
        { id: "newer", eventStartsAt: new Date("2026-10-22T10:00:00.000Z"), eventEndsAt: null },
    ];
    const all = [
        { id: "older", type: "NEWS", publishedAt: new Date("2026-10-20T10:00:00.000Z"), eventStartsAt: null, eventEndsAt: null },
        { id: "newer", type: "NEWS", publishedAt: new Date("2026-10-22T10:00:00.000Z"), eventStartsAt: null, eventEndsAt: null },
        { id: "upcoming", type: "EVENT", publishedAt: new Date("2026-10-18T10:00:00.000Z"), eventStartsAt: new Date("2026-10-24T10:00:00.000Z"), eventEndsAt: null },
        { id: "past", type: "EVENT", publishedAt: new Date("2026-10-23T10:00:00.000Z"), eventStartsAt: new Date("2026-10-22T10:00:00.000Z"), eventEndsAt: null },
    ];
    const now = new Date("2026-10-23T12:00:00.000Z");

    assert.deepEqual(orderUpcomingEvents(upcoming).map((event) => event.id), ["sooner", "later"]);
    assert.deepEqual(orderPastEvents(past).map((event) => event.id), ["newer", "older"]);
    assert.deepEqual(orderAll(all, now).map((item) => item.id), ["upcoming", "past", "newer", "older"]);
    assert.deepEqual(upcoming.map((event) => event.id), ["later", "sooner"]);
    assert.deepEqual(past.map((event) => event.id), ["older", "newer"]);
    assert.deepEqual(all.map((item) => item.id), ["older", "newer", "upcoming", "past"]);
});

test("news dates use the Malawi calendar day regardless of UTC date", () => {
    assert.equal(formatNewsDate(new Date("2026-10-24T22:30:00.000Z")), "25 Oct 2026");
});

test("news date-times format in Malawi time", () => {
    const formatted = formatNewsDate(new Date("2026-10-25T13:00:00.000Z"), true);
    assert.match(formatted, /25 Oct 2026/);
    assert.match(formatted, /3:00 pm/);
});