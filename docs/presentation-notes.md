# Presentation notes: Account Desk (keep it simple, no deep tech)

## The problem (20 sec)
I inherited two accounts from Sam. Both "are going well", but the data says half the docks are idle and both renewals rest on one person.

## What I built (30 sec)
A live CRM, built so a CSM can act on it on Monday. It answers five questions for every account: what is the book worth, who holds the power, what do I do first, what is about to go wrong, and what do I still not know. Every number has a source you can click.

## How it works (simple architecture, 30 sec)
1. **Connect:** the CRM talks to the game through its own MCP connection, once a minute, and picks up new data by itself (new events and even new accounts arrived during the build and appeared automatically).
2. **Think:** a rules engine turns raw data (calls, usage, tickets) into risks, ranked moves and plans. Facts are marked verified, told or claim; claims are never counted as money.
3. **Act:** the to-do list, drafts, the plan for Neel and lessons are written back to the game. An AI Copilot answers questions and cites its sources.

## Demo path (2 min)
Cockpit (live view) → Portfolio → Eastern Counties: the five answers → click £350,000 to show the contract → Account plan: Tarn Valley (send the documents → they fly → prove value → ask about their stadium) → Playbook: mistakes we won't repeat → Copilot question → Change log: a live event arriving.

## The CS thinking (30 sec)
- From reactive to proactive: each play shows what delivering one thing unlocks (a person, usage, money, expansion).
- Fix, then prove, then expand: no expansion pitch while docks are idle.
- Lessons carry over: what blocked Tarn Valley becomes a week-1 checklist for the next police force.

## If asked "what's next?"
A dock-to-site map (not in the data yet), team logins, and history of how scores changed over time.
