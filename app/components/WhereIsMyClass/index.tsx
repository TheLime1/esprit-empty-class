"use client";

import { useState } from "react";
import { ClassSearchForm } from "./ClassSearchForm";
import { ClassResults } from "./ClassResults";
import { ClassResultSkeleton } from "../Shared/Skeletons";
import { ErrorState } from "../Shared/ErrorState";

interface TimeSlot {
  time: string;
  course: string;
  room: string;
}

interface ClassLocation {
  classCode: string;
  status: "in_session" | "not_in_session" | "no_schedule";
  room?: {
    roomId: string;
    name: string;
    building: string;
    coords?: { lat: number; lng: number };
  };
  session?: {
    start: string;
    end: string;
    course?: string;
  };
  nextSession?: {
    day: string;
    start: string;
    end: string;
    room: string;
    course?: string;
  };
  fullSchedule?: {
    [day: string]: TimeSlot[];
  };
}

export function WhereIsMyClass() {
  const [result, setResult] = useState<ClassLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (classCode: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url = `/api/classes/${encodeURIComponent(classCode)}/location`;
      const res = await fetch(url);
      const data = await res.json();

      if ((data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      setResult(data as ClassLocation);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ClassSearchForm onSearch={handleSearch} loading={loading} />

      {loading && <ClassResultSkeleton />}

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {!loading && !error && result && <ClassResults result={result} />}
    </div>
  );
}
