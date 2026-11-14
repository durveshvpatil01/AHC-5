# Walkthrough video: read-aloud script (≈4½ min; ≈3 min if you skip the [SKIP if short] parts)

**Before you record (2 min)**
1. Open **https://account-desk-crm.onrender.com** in Chrome and wait until the header pill says **MCP live** (green). If it's asleep, the first load takes ~1 minute.
2. Open a second tab with **https://github.com/durveshvpatil01/AHC-5** (for the code part).
3. Record the screen: **Win + Alt + R** (Xbox Game Bar), or Loom / OBS. Use full screen and a 100% zoom.
4. Speak slowly. **Bold lines = what you say.** *Italic = what you click.* Keys work anywhere: `x` = Cockpit, `p` = Portfolio, `1` = Eastern Counties, `a` = Account plan, `l` = Change log, `c` = Copilot, `Esc` closes things.

---

## 0:00 · Opening: Cockpit (20 s)
*Press `x` (Cockpit mode).*

**"This is Account Desk: the live CRM I'd hand my manager on Monday for the two FlytBase accounts I took over from Sam, plus the two accounts that were dropped on us mid-build. This is cockpit mode: health per account, renewal countdowns, the next moves on the clock, red risks, and on the right, the live feed of calls this portal makes to the Account Quest MCP by itself."**

*Press `Esc`.*

## 0:20 · Portfolio (25 s)
*Press `p`.*

**"The portfolio: every account with its health score, its renewal backed by the contract, and two lines: what the account sheet says, and what the data says. For Eastern Counties the sheet says the rollout is under way; the data says only 17 of 35 docks fly regularly. Below is this week's first moves across all accounts, ranked and dated, and the live events as they arrive."**

## 0:45 · The five answers for Eastern Counties (75 s)
*Press `1` (Eastern Counties).*

**"Every account answers the same five questions, right here in this strip. Let me go through them for the police alliance."**

*Click **Q1 / 1 · Book**.*
**"One: what is the book worth? The renewal is £350,000, backed by the contract, but £180,000 of it pays for 18 docks that fly less than weekly. The tender and the 30-dock stadium are only claims, so they are shown apart and never added to the total."**

*Click **2 · Power**.*
**"Two: who holds the power? For each deal: who decides, pays, signs, uses, could block, and their stance. Red dashed boxes are seats held by people we have never met. Rhys signs, but he is leaving in January."**

*Click **3 · First moves**.*
**"Three: what do I do first? Moves are ranked by stake times confidence divided by days left. Number one: reply to Inspector Karen in writing before her 5 December event, with training dates and named cover. Each move has an owner, a due date, the deal it moves, a drafted message, and a Save to game button that writes it back through the MCP."**

*Click **4 · About to go wrong**.*
**"Four: what is about to go wrong? Red and amber risks, each with the rule that raised it and the date it turns bad."**

*Click **5 · Unknowns**.*
**"Five: what don't I know? The gaps my plan rests on, and who can tell me. For example: who sent the document request FB-10412, which may be what Tarn Valley's sign-off is waiting for."**

## 2:00 · One number traced to its source (30 s)
*Go back to **1 · Book**. Click the small chip **contract.txt** under £350,000.*

**"Every number carries the id it comes from. Click it, and here is the actual contract: 350,000 a year for 35 docks, so 10,000 per dock."** *(Esc)*

*Click **Fleet** tab → filter **never**. Click the chip **ECPA-D09**.*

**"And here is one of the idle docks behind the £180,000: zero flights since April, online every day, computed from the weekly usage file. Nothing on screen is typed in by hand."** *(Esc)*

## 2:30 · It picking up something new (40 s)
*Click the green **MCP live** pill in the header.*

**"This is the portal's own MCP connection. A server-side scheduler calls the MCP once a minute, which is the token's limit, always to the most overdue source: live events, accounts, notes, paperwork, files. Here's the call log."** *(Esc)*

*Press `l` (Change log).*

**"When the organisers dropped new data this afternoon, the CRM picked it up with no code change. Live events are merged into the paperwork. For example, the usage drop at Aldermoor added four weeks of usage, and the change shows as before and after: three busy docks went silent. That created a red risk and the number-one move automatically."**

*Point at the sidebar: **Brindle Harbour** and **Kestrel Estates**.*

**"And two whole new accounts, Brindle Harbour and Kestrel, appeared through the MCP mid-build, with their own answers, plays and files."**

## 3:10 · The plan for Neel: unlock map + lessons [SKIP if short] (35 s)
*Press `a` (Account plan), Eastern Counties. Scroll to **Unlock map**.*

**"This is what I'd present to Neel. Each play is an unlock chain. Tarn Valley: deliver the documentation it's waiting on, then meet its drone lead, then it flies, which stays blocked until the document lands, then prove the value, and only then ask whether they have a stadium too. The status of each step is worked out from live data, so the plan moves on by itself. Below is each force, what we know, can give and can build, and the plan for the next two weeks, the quarter and the year."**

*Press `y` (Playbook) for 3 seconds.*

**"And the Playbook: mistakes we won't repeat, with evidence. They become warnings on moves, like 'don't pitch expansion while docks are idle', and a checklist for onboarding the next police force."**

## 3:45 · AI Copilot [SKIP if short] (30 s)
*Press `c`. Click the suggestion **"What should I do first on Monday, and why?"** (or type it). Wait ~10 s.*

**"The Copilot is Claude, grounded only on this CRM's data. Every claim carries a source chip I can click, and the app checks every citation: here it says all citations were found."**

## 4:15 · The code, briefly (30 s)
*Switch to the GitHub tab (AHC-5). Open `src/lib/sync.ts`, then `src/lib/engine.ts`, then the `tests` folder.*

**"The code: sync.ts is the MCP client and scheduler, with the token kept on the server. engine.ts holds the rules that produce the five answers, each rule named on screen. plan.ts and lessons.ts are the plan and the playbook. And there are automated tests that check every cited id exists, so nothing is invented."**

## 4:45 · Close (10 s)
**"Every number cited, ranked moves with owners and dates, honest gaps, a plan you can act on Monday, and it stays live. That's Account Desk. Thank you."**

---

**After recording:** upload to Google Drive → right-click → Share → General access: **Anyone with the link** (Viewer) → Copy link → paste it into the portal's *Walkthrough video* box → Submit.
