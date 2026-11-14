# Walkthrough video: 3 minutes (record the hosted link, in a private window)

**0:00-0:15 · Hook (Portfolio)**
"This is Account Desk, the CRM I'd hand my manager on Monday. Two renewals, both resting on one person, and half the fleet idle. Every number on screen has a chip with the id it came from."
Show the two account cards: health 47 and 33, the renewals, the docks-in-use bars, and "Sheet says" next to "Data says".

**0:15-1:25 · The five answers for Eastern Counties (A)**
Click *Eastern Counties*. Point at the five-answer strip, then open each tab briefly:
1. **Book:** "£350,000 renewal, backed by the contract. £180,000 of it pays for 18 docks that fly less than weekly. The tender and the stadium are claims, so they sit apart and are never totalled."
2. **Power:** "Nine decision seats are held by people we've never met, shown in red. Rhys signs, but he's leaving. Hannah in procurement decides. Who pays is in Schedule 2, which we don't hold."
3. **First moves:** "Ranked by stake × confidence ÷ days left. Number one: reply to Karen in writing before her 5 December event. Owner me plus Pranjal, due tomorrow, and it delivers the two offers we won." Click **Save to game** to show write-back.
4. **About to go wrong:** "Red: an unanswered request open since June, the champion leaving, 17 idle docks. Each one has the date it turns bad."
5. **Unknowns:** "Who sent FB-10412, and is it what Tarn Valley's sign-off is waiting for? Who can tell us: the support desk."

**1:25-1:50 · One number traced to its source**
On the Book tab, click the chips under £180,000 → `contract.txt` (£350,000 ÷ 35 docks = £10,000 a dock) → Fleet tab, filter **stopped/never** → click a dock chip, e.g. `ECPA-D09` → "0 flights since April, online every day, computed from usage_weekly.csv."

**1:50-2:25 · It picking up something new**
Switch to Aldermoor. "A live event arrived: new usage weeks for November. The CRM merged those rows into the fleet data by itself." Fleet → flagged: **AD-02, AD-05, AD-10 stopped: 0 flights in 2 weeks**. "That created a red risk and the number-one move, with no code change." Show the Live pill and the live-events feed on Portfolio. (If a new event lands during the demo, show the toast.)

**2:25-2:55 · The code, briefly**
VS Code: `src/lib/engine.ts` (rules R-USAGE, R-DROP and R-OPEN, and the move score) · `src/lib/model.ts` `mergeSignals` · `src/lib/aq.ts` (token server-side, staggered cache, snapshot fallback) · `scripts/engine-check.ts` → "MISSING CITES: none".

**2:55-3:00 · Close**
"Every number cited, ranked moves with owners and dates, honest gaps, and it stays live."
