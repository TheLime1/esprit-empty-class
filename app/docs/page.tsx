"use client";

import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiResponse {
  days?: string[];
  rooms?: string[];
  occupied?: string[];
  empty?: string[];
  warning?: string[];
  error?: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [apiKey, setApiKey] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [building, setBuilding] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  // Nearest room state
  const [nrClass, setNrClass] = useState("");
  const [nrDay, setNrDay] = useState("");
  const [nrTime, setNrTime] = useState("");
  const [nrResponse, setNrResponse] = useState<ApiResponse | null>(null);
  const [nrStatus, setNrStatus] = useState<number | null>(null);
  const [nrLoading, setNrLoading] = useState(false);

  useEffect(() => {
    setBaseUrl(globalThis.location.origin);
  }, []);

  const handleTryIt = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);

    const params = new URLSearchParams();
    if (day) params.set("day", day);
    if (time) params.set("time", time);
    if (building) params.set("building", building);

    const qs = params.toString();
    const url = qs ? "/api/v1/rooms/free?" + qs : "/api/v1/rooms/free";

    try {
      const res = await fetch(url, {
        headers: apiKey ? { "X-API-Key": apiKey } : {},
      });
      setStatus(res.status);
      const json = await res.json();
      setResponse(json);
    } catch (err) {
      setStatus(0);
      setResponse({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleTryNearest = async () => {
    setNrLoading(true);
    setNrResponse(null);
    setNrStatus(null);

    const params = new URLSearchParams();
    if (nrClass) params.set("class", nrClass);
    if (nrDay) params.set("day", nrDay);
    if (nrTime) params.set("time", nrTime);

    const qs = params.toString();
    const url = qs ? "/api/v1/rooms/nearest?" + qs : "/api/v1/rooms/nearest";

    try {
      const res = await fetch(url, {
        headers: apiKey ? { "X-API-Key": apiKey } : {},
      });
      setNrStatus(res.status);
      const json = await res.json();
      setNrResponse(json);
    } catch (err) {
      setNrStatus(0);
      setNrResponse({ error: String(err) });
    } finally {
      setNrLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            ESPRIT Classroom Finder API
          </h1>
          <p className="text-muted-foreground text-lg">
            Internal API for finding empty classrooms at ESPRIT.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-sm text-amber-800 dark:text-amber-200">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            Requires API key &mdash; internal use only
          </div>
        </header>

        {/* Authentication */}
        <Section title="Authentication">
          <p className="mb-4 text-muted-foreground">
            Every request must include an <Code>X-API-Key</Code> header with a
            valid API key.
          </p>
          <CodeBlock>
            {`curl -H "X-API-Key: YOUR_API_KEY" ${baseUrl || "https://your-domain.com"}/api/v1/rooms/free`}
          </CodeBlock>
        </Section>

        {/* Endpoint */}
        <Section title="Endpoint">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block rounded bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              GET
            </span>
            <code className="text-sm font-mono">/api/v1/rooms/free</code>
          </div>
          <p className="text-muted-foreground">
            Returns lists of available days, all rooms, and categorises rooms
            into <Code>occupied</Code>, <Code>empty</Code>, and{" "}
            <Code>warning</Code> (soutenance risk).
          </p>
        </Section>

        {/* Parameters */}
        <Section title="Query Parameters">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-semibold">Parameter</th>
                  <th className="py-3 pr-4 font-semibold">Type</th>
                  <th className="py-3 pr-4 font-semibold">Required</th>
                  <th className="py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <Code>day</Code>
                  </td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">
                    French day name from the schedule, e.g.{" "}
                    <Code>Lundi 10 Février</Code>. Defaults to the first
                    available day.
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <Code>time</Code>
                  </td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">
                    24-hour time as <Code>HH:MM</Code>, e.g. <Code>09:00</Code>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Code>building</Code>
                  </td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">
                    Building/bloc filter. One of <Code>A</Code>, <Code>B</Code>,{" "}
                    <Code>C</Code>, <Code>IJK</Code>, etc. Use <Code>all</Code>{" "}
                    or omit for all buildings.
                    <Code>I</Code>, <Code>J</Code>, <Code>K</Code> are treated
                    as one group (<Code>IJK</Code>).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Response */}
        <Section title="Response">
          <p className="mb-3 text-muted-foreground">
            <Code>200 OK</Code> &mdash; JSON object:
          </p>
          <CodeBlock>
            {JSON.stringify(
              {
                days: ["Lundi 10 Février", "Mardi 11 Février", "..."],
                rooms: ["A12", "B1-201", "C305", "..."],
                occupied: ["A12", "..."],
                empty: ["B1-201", "..."],
                warning: ["C305", "..."],
              },
              null,
              2,
            )}
          </CodeBlock>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              <Code>days</Code> &mdash; all available schedule days (sorted Mon
              → Sun).
            </p>
            <p>
              <Code>rooms</Code> &mdash; all known physical rooms (excludes
              &quot;En Ligne&quot;).
            </p>
            <p>
              <Code>occupied</Code> &mdash; rooms with a class at the given
              day/time.
            </p>
            <p>
              <Code>empty</Code> &mdash; rooms confirmed free.
            </p>
            <p>
              <Code>warning</Code> &mdash; rooms technically free but with
              soutenance (defense) risk.
            </p>
          </div>
        </Section>

        {/* Errors */}
        <Section title="Error Codes">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <Code>400</Code>
                  </td>
                  <td className="py-3">
                    Bad request — invalid <Code>time</Code> format.
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <Code>401</Code>
                  </td>
                  <td className="py-3">
                    Missing or invalid <Code>X-API-Key</Code> header.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Code>500</Code>
                  </td>
                  <td className="py-3">
                    Server error (e.g. schedule data not found).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Example */}
        <Section title="cURL Example">
          <CodeBlock>
            {`curl -s \\
  -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl || "https://your-domain.com"}/api/v1/rooms/free?day=Lundi%2010%20F%C3%A9vrier&time=09:00&building=A"`}
          </CodeBlock>
        </Section>

        {/* ── Nearest Room Endpoint ──────────────────────────────────── */}
        <div className="border-t border-border pt-8 mt-8 mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Nearest Empty Room
          </h2>
          <p className="text-muted-foreground mb-8">
            Given a class code, resolves its current room from the schedule and
            finds the closest empty room.
          </p>
        </div>

        <Section title="Nearest Endpoint">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block rounded bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              GET
            </span>
            <code className="text-sm font-mono">/api/v1/rooms/nearest</code>
          </div>
          <p className="text-muted-foreground">
            Resolves the class&apos;s current room from the schedule, then
            returns the nearest empty room ranked by proximity:{" "}
            <strong>
              same block → same floor → floor below → floor above → closest room
              number
            </strong>
            .
          </p>
        </Section>

        <Section title="Nearest Parameters">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-semibold">Parameter</th>
                  <th className="py-3 pr-4 font-semibold">Type</th>
                  <th className="py-3 pr-4 font-semibold">Required</th>
                  <th className="py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <Code>class</Code>
                  </td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">
                    <strong>Yes</strong>
                  </td>
                  <td className="py-3">
                    The class code, e.g. <Code>4SAE11</Code>, <Code>3A21</Code>.
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">
                    <Code>day</Code>
                  </td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">
                    French day name from the schedule. Defaults to first
                    available day.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Code>time</Code>
                  </td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">
                    24-hour time as <Code>HH:MM</Code>, e.g. <Code>09:00</Code>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Nearest Response">
          <p className="mb-3 text-muted-foreground">
            <Code>200 OK</Code> &mdash; JSON object:
          </p>
          <CodeBlock>
            {JSON.stringify(
              {
                class: "4SAE11",
                currentRoom: "G308",
                nearest: "G305",
                isWarning: false,
                day: "Lundi 10 Février",
                time: "09:00",
                topCandidates: [
                  { room: "G305", isWarning: false, score: 3 },
                  { room: "G311", isWarning: false, score: 3 },
                  { room: "G301", isWarning: false, score: 7 },
                ],
              },
              null,
              2,
            )}
          </CodeBlock>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              <Code>class</Code> &mdash; the class code you queried.
            </p>
            <p>
              <Code>currentRoom</Code> &mdash; the room resolved from the
              schedule for that class.
            </p>
            <p>
              <Code>nearest</Code> &mdash; the closest empty room (
              <Code>null</Code> if none found).
            </p>
            <p>
              <Code>isWarning</Code> &mdash; whether the nearest room has
              soutenance risk.
            </p>
            <p>
              <Code>topCandidates</Code> &mdash; top 10 closest rooms with their
              proximity scores (lower = closer).
            </p>
          </div>

          <div className="mt-6 p-4 rounded-md bg-muted/40 border border-border">
            <h4 className="text-sm font-semibold mb-2">
              Proximity Score Breakdown
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong>0–999</strong> — same block, same floor (score = room
                number distance)
              </li>
              <li>
                <strong>1000–1999</strong> — same block, 1 floor below
              </li>
              <li>
                <strong>2000–2999</strong> — same block, 1 floor above
              </li>
              <li>
                <strong>3000+</strong> — same block, further floors
              </li>
              <li>
                <strong>10000+</strong> — different block
              </li>
              <li>
                Warning rooms get +0.5 penalty so confirmed-empty rooms win
                ties.
              </li>
            </ul>
          </div>
        </Section>

        <Section title="Nearest cURL Example">
          <CodeBlock>
            {`curl -s \\
  -H "X-API-Key: YOUR_API_KEY" \\
  "${baseUrl || "https://your-domain.com"}/api/v1/rooms/nearest?class=4SAE11&day=Lundi&time=09:00"`}
          </CodeBlock>
        </Section>

        {/* ── Try Nearest Panel ──────────────────────────────────────── */}
        <Section title="Try Nearest">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              Uses the API key from the top panel.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="nr-class"
                  className="block text-sm font-medium mb-1.5"
                >
                  class <span className="text-red-500">*</span>
                </label>
                <input
                  id="nr-class"
                  type="text"
                  value={nrClass}
                  onChange={(e) => setNrClass(e.target.value)}
                  placeholder="4SAE11"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="nr-day"
                  className="block text-sm font-medium mb-1.5"
                >
                  day <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="nr-day"
                  type="text"
                  value={nrDay}
                  onChange={(e) => setNrDay(e.target.value)}
                  placeholder="Lundi 10 Février"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="nr-time"
                  className="block text-sm font-medium mb-1.5"
                >
                  time <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="nr-time"
                  type="text"
                  value={nrTime}
                  onChange={(e) => setNrTime(e.target.value)}
                  placeholder="09:00"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button
              onClick={handleTryNearest}
              disabled={nrLoading}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {nrLoading ? "Sending…" : "Send Request"}
            </button>
            {nrStatus !== null && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Response</span>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                      nrStatus >= 200 && nrStatus < 300
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {nrStatus}
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto rounded-md bg-muted/60 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {JSON.stringify(nrResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Section>

        {/* ── Try It Panel (Free Rooms) ───────────────────────────────── */}
        <Section title="Try Free Rooms">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            {/* API Key */}
            <div>
              <label
                htmlFor="api-key"
                className="block text-sm font-medium mb-1.5"
              >
                API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your X-API-Key"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Params */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="param-day"
                  className="block text-sm font-medium mb-1.5"
                >
                  day <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="param-day"
                  type="text"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  placeholder="Lundi 10 Février"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="param-time"
                  className="block text-sm font-medium mb-1.5"
                >
                  time <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="param-time"
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="09:00"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="param-building"
                  className="block text-sm font-medium mb-1.5"
                >
                  building{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="param-building"
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="A, B, IJK, all"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Send button */}
            <button
              onClick={handleTryIt}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? "Sending…" : "Send Request"}
            </button>

            {/* Response */}
            {status !== null && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Response</span>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                      status >= 200 && status < 300
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto rounded-md bg-muted/60 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Reusable sub-components ────────────────────────────────────────────────

function Section({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="mb-12">
      <h2
        className="text-2xl font-semibold tracking-tight mb-4 scroll-mt-20"
        id={title.toLowerCase().replaceAll(/\s+/g, "-")}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/60 p-4 text-sm font-mono leading-relaxed">
      {children}
    </pre>
  );
}
