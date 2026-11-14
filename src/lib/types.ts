// Contract between the data engine (src/lib) and the UI (src/components). Plain JSON, safe to send to the client.

export type Stance = "guarded" | "neutral" | "warm" | "ally" | "unknown";
export type Level = "red" | "amber" | "green" | "grey";

/** A source anything on screen can cite. `id` is a real id from the MCP data (fact, person, deal, file, record path, ticket, dock, signal). */
export interface Source {
  id: string;
  kind: string; // fact | person | deal | offer | file | record | ticket | dock | signal | invoice
  title: string;
  text: string;
  meta?: string;
}

export interface Money {
  amount: number | null;
  currency: string; // GBP | EUR | game$
  basis: "backed" | "told" | "claim" | "unknown";
  cite: string[];
  note?: string;
}

export interface PowerSeat {
  role: "decides" | "pays" | "signs" | "uses" | "could block" | "champions";
  personId: string | null;
  name: string;
  stance: Stance;
  met: boolean;
  cite: string[];
  note?: string;
}

export interface Deal {
  id: string;
  title: string;
  stage: string; // identified | qualified | cleared | agreed | offer-won | offer-declined | on file
  kind: "renewal" | "expansion" | "new" | "offer" | "service";
  value: Money;
  seats: PowerSeat[];
  blocker: string | null;
  blockerCite: string[];
  next: string;
  deadline: string | null; // ISO date or null
  deadlineText: string | null;
  evidence: string[];
}

export interface Move {
  id: string;
  rank: number;
  title: string;
  detail: string;
  owner: string;
  helpers: string[];
  due: string; // ISO date
  dealIds: string[];
  why: string; // the rule that ranked it
  score: { stake: number; currency: string; daysLeft: number; confidence: number; total: number };
  cite: string[];
  noteText: string; // what we write back with write_note
}

export interface Risk {
  id: string;
  level: Level;
  title: string;
  detail: string;
  turnsBadOn: string | null;
  rule: string;
  cite: string[];
}

export interface Gap {
  id: string;
  question: string;
  why: string;
  whoCanTell: string;
  rule: string;
  cite: string[];
}

export interface DockStat {
  dockId: string;
  total: number;
  last4: number;
  prev4: number;
  daysOnline4: number;
  connLost: number;
  battery: number;
  lastFlight: string | null;
  status: "active" | "low" | "dormant" | "never" ;
  flags: string[];
  trend: number[]; // flights per week, last 12 weeks
}

export interface TimelineItem {
  date: string;
  kind: string;
  title: string;
  who: string;
  cite: string;
  isNew?: boolean;
}

export interface Signal {
  id: string;
  account: string;
  dated: string;
  title: string;
  summary: string;
  records: string[];
  impact: string[];
}

export interface Person {
  id: string;
  name: string;
  role: string;
  stance: Stance;
  met: boolean;
  lastContact: string | null;
  signIns90: number | null;
  note: string;
  cite: string[];
}

export interface Kpis {
  renewal: Money;
  termEnds: string;
  daysToRenewal: number;
  docks: number;
  active: number;
  low: number;
  dormant: number;
  never: number;
  utilisation: number; // active / docks
  flightsLast4: number;
  flightsPrev4: number;
  openItems: number;
  offersWon: number;
  health: { score: number; parts: { name: string; value: number; weight: number; note: string }[] };
}

export interface AccountView {
  id: "A" | "B";
  name: string;
  sector: string;
  currency: string;
  officialStory: string;
  dataStory: string;
  dataStoryCite: string[];
  kpis: Kpis;
  deals: Deal[];
  people: Person[];
  moves: Move[];
  risks: Risk[];
  gaps: Gap[];
  fleet: DockStat[];
  weeks: string[];
  timeline: TimelineItem[];
  signals: Signal[];
  answers: { book: string; power: string; first: string; wrong: string; unknown: string };
}

export interface CrmView {
  asOf: string;
  generatedAt: string;
  sync: { export: { source: string; at: string }; signals: { source: string; at: string; count: number }; notes: { source: string; at: string; count: number } };
  accounts: AccountView[];
  sources: Record<string, Source>;
  notes: { id: string; account?: string; kind?: string; title?: string; text: string; at?: string }[];
  team: { id: string; name: string; role: string }[];
}
