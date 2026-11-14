// Tests for the rules engine and the live-data merge, on a frozen copy of the 14 Nov data
// (tests/fixtures: the export, both paperwork packs and the three original live events).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCrm, dateIn, parseTaskNote } from "../src/lib/engine";
import { fleetStats, mergeSignals, type RawExport, type RawPack, type RawSignal } from "../src/lib/model";

const fx = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8")) as T;
const exp = fx<RawExport>("export.json");
const packs = [fx<RawPack>("pack_A.json"), fx<RawPack>("pack_B.json")];
const signals = fx<{ signals: RawSignal[] }>("signals.json").signals;
const sync = { export: { source: "test", at: "" }, signals: { source: "test", at: "", count: 0 }, notes: { source: "test", at: "", count: 0 } };
const files = { flight_log_force_month: fx<unknown>("file_flight_log_force_month.json") };
const build = (over: Partial<Parameters<typeof buildCrm>[0]> = {}) => buildCrm({ exp, packs, signals, notes: [], team: [], sync, files, ...over });

/** Every id cited anywhere in the CRM view. */
function allCites(crm: ReturnType<typeof build>) {
  return crm.accounts.flatMap((a) => [
    ...a.deals.flatMap((d) => [...d.value.cite, ...d.blockerCite, ...d.seats.flatMap((s) => s.cite)]),
    ...a.moves.flatMap((m) => [...m.cite, ...(m.draft?.cite ?? [])]),
    ...a.risks.flatMap((r) => r.cite),
    ...a.gaps.flatMap((g) => g.cite),
    ...a.dataStoryCite,
  ]);
}

describe("numbers you can back", () => {
  it("every cited id exists in the sources (no invented ids)", () => {
    const crm = build();
    const missing = [...new Set(allCites(crm))].filter((id) => !crm.sources[id]);
    expect(missing).toEqual([]);
  });

  it("renewals are backed by the contract, claims are never backed", () => {
    const crm = build();
    const A = crm.accounts.find((a) => a.id === "A")!;
    expect(A.kpis.renewal).toMatchObject({ amount: 350000, currency: "GBP", basis: "backed" });
    expect(A.kpis.renewal.cite).toContain("A:contract.txt");
    const stadium = A.deals.find((d) => d.id === "a_westmere")!;
    expect(stadium.value.basis).toBe("claim");
  });
});

describe("fleet analytics", () => {
  it("classifies Eastern Counties docks from weekly usage", () => {
    const { docks } = fleetStats(packs[0]);
    expect(docks).toHaveLength(35);
    expect(docks.filter((d) => d.status === "never").map((d) => d.dockId)).toContain("ECPA-D09");
    expect(docks.filter((d) => d.status === "active")).toHaveLength(17);
  });

  it("merging the usage_drop event adds the new weeks and flags the three docks that stopped", () => {
    const before = fleetStats(packs[1]).docks.filter((d) => d.flags.some((f) => f.startsWith("stopped")));
    const merged = mergeSignals(packs[1], signals);
    const after = fleetStats(merged).docks.filter((d) => d.flags.some((f) => f.startsWith("stopped"))).map((d) => d.dockId);
    expect(before).toHaveLength(0);
    expect(after.sort()).toEqual(["AD-02", "AD-05", "AD-10"]);
  });

  it("merging is idempotent: the same event twice adds rows once", () => {
    const once = mergeSignals(packs[1], signals);
    const twice = mergeSignals(once, signals);
    const rows = (p: RawPack) => p.records.find((r) => r.path === "usage_weekly.csv")!.text!.trim().split("\n").length;
    expect(rows(twice)).toBe(rows(once));
  });
});

describe("first moves", () => {
  it("ranks the urgent reply to Karen first and dates every move inside its deadline", () => {
    const A = build().accounts.find((a) => a.id === "A")!;
    expect(A.moves[0].id).toBe("A-M-EVENT");
    for (const m of A.moves) expect(m.due >= build().asOf).toBe(true);
    expect(A.moves.find((m) => m.id === "A-M-EVENT")!.due <= "2026-12-04").toBe(true);
  });

  it("task notes from the game mark a move done and re-rank the rest", () => {
    const crm = build({ notes: [{ id: "1", title: "task:A-M-EVENT", text: "status=done; owner=You (CSM); due=2026-12-01; by=CSM", at: "2026-11-14 10:00" }] });
    const A = crm.accounts.find((a) => a.id === "A")!;
    const ev = A.moves.find((m) => m.id === "A-M-EVENT")!;
    expect(ev.status).toBe("done");
    expect(A.moves[A.moves.length - 1].id).toBe("A-M-EVENT");
    expect(A.answers.first).not.toContain("Reply to Karen");
  });

  it("parses task notes", () => {
    expect(parseTaskNote({ title: "task:B-M-FINANCE", text: "status=open; owner=Achal Negi; due=2026-12-02" })).toEqual({ moveId: "B-M-FINANCE", fields: { status: "open", owner: "Achal Negi", due: "2026-12-02" } });
    expect(parseTaskNote({ title: "draft:B-M-FINANCE", text: "x" })).toBeNull();
  });
});

describe("staying live", () => {
  it("an unknown live event becomes a risk and a dated move, with a before/after", () => {
    const extra: RawSignal = {
      id: "plant7_cancel", account: "B", dated: "2026-12-03", title: "Aldermoor: Plant 7 asks to cancel its dock",
      summary: "Beatriz Alonso asked group finance to stop paying for the Plant 7 dock from 1 January. Nobody has replied.",
      records: [{ kind: "request", path: "B/requests.csv", text: 'request_id,opened,from,summary,status,owner,last_update,how_it_arrived\nFB-11400,2026-12-03,Plant 7,"Asks to stop paying for the dock.",Open,,2026-12-03,Email\n' }],
    };
    const B = build({ signals: [...signals, extra] }).accounts.find((a) => a.id === "B")!;
    expect(B.risks.find((r) => r.id === "B-R-SIGNAL-plant7_cancel")?.level).toBe("red");
    const mv = B.moves.find((m) => m.id === "B-M-SIGNAL-plant7_cancel")!;
    expect(mv.due).toBe("2026-12-04");
    expect(B.signals.find((s) => s.id === "plant7_cancel")!.impact.some((l) => l.includes("Open requests with no owner: 2 → 3"))).toBe(true);
  });

  it("a brand-new account does not crash the CRM and starts with an intro move", () => {
    const crm = build({ signals: [...signals, { id: "c_open", account: "C", dated: "2026-12-02", title: "Northgate Ports: new account", summary: "A pilot was signed.", records: [] }] });
    const C = crm.accounts.find((a) => a.id === "C")!;
    expect(C.name).toBe("Northgate Ports");
    expect(C.moves.some((m) => m.id === "C-M-INTRO")).toBe(true);
    expect(C.kpis.daysToRenewal).toBeNull();
  });

  it("finds dates written in words", () => {
    expect(dateIn("an event on 5 December", "2026-11-18")).toBe("2026-12-05");
    expect(dateIn("from 1 January", "2026-12-03")).toBe("2027-01-01");
    expect(dateIn("no date here", "2026-12-03")).toBeNull();
  });
});

describe("discovery", () => {
  it("tests every claim against the files and contradicts the two official stories", () => {
    const crm = build();
    const tested = crm.accounts.flatMap((a) => a.discovery.tested);
    const claims = crm.accounts.flatMap((a) => a.discovery.facts.filter((f) => f.status === "claim"));
    expect(tested).toHaveLength(claims.length);
    expect(tested.filter((t) => t.verdict === "contradicted").map((t) => t.claimId).sort()).toEqual(["rc_appetite_0", "sr_roll_0"]);
    expect(tested.flatMap((t) => t.cite).filter((id) => !crm.sources[id])).toEqual([]);
  });

  it("links each fact to the deals it unlocked", () => {
    const A = build().accounts.find((a) => a.id === "A")!;
    expect(A.discovery.facts.find((f) => f.id === "km_usage_1")!.unlocks).toContain("a_renewal");
  });
});

describe("account plan and lessons", () => {
  it("reads each force from the flight log, skipping the re-sent blank row", () => {
    const A = build().accounts.find((a) => a.id === "A")!;
    const seg = Object.fromEntries(A.plan.segments.map((g) => [g.name, g]));
    expect(seg["Westmere"]).toMatchObject({ docks: 18, live: 14, missions: 126, state: "flying" });
    expect(seg["Tarn Valley"].state).toBe("not live");
    expect(seg["Norwold"].state).toBe("training only");
  });

  it("Tarn Valley's play: the document comes first and flying stays blocked until it is delivered", () => {
    const A = build().accounts.find((a) => a.id === "A")!;
    const tarn = A.plan.chains.find((c) => c.id === "A-C-TARN")!;
    expect(tarn.steps[0]).toMatchObject({ kind: "deliver", status: "open" });
    expect(tarn.steps.find((s) => s.kind === "usage")!.status).toBe("blocked");
    expect(A.plan.plan.find((p) => p.stepId === "A-S-TARN-1")!.horizon).toBe("2w");
  });

  it("every citation in the plan and the lessons resolves", () => {
    const crm = build();
    const ids = crm.accounts.flatMap((a) => [
      ...a.plan.chains.flatMap((c) => [...c.cite, ...c.value.cite, ...c.steps.flatMap((s) => s.cite)]),
      ...a.plan.segments.flatMap((g) => g.cite),
      ...a.lessons.lessons.flatMap((l) => [l.id, ...l.cite]),
    ]);
    expect([...new Set(ids)].filter((id) => !crm.sources[id])).toEqual([]);
  });

  it("the early expansion pitch becomes a lesson and a guard on expansion moves", () => {
    const B = build().accounts.find((a) => a.id === "B")!;
    expect(B.lessons.lessons.some((l) => l.id === "B-L-EXPAND")).toBe(true);
    expect(B.moves.find((m) => m.id === "B-M-SAVINGS")!.warnings?.[0]).toMatch(/Don't pitch yet/);
  });
});

