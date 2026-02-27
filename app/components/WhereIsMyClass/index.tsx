"use client";

import { useState, useEffect } from "react";
import { ClassSearchForm } from "./ClassSearchForm";
import { ClassResults } from "./ClassResults";
import { NearestEmptyRoom } from "./NearestEmptyRoom";
import { ClassResultSkeleton } from "../Shared/Skeletons";
import { ErrorState } from "../Shared/ErrorState";
import { TIME_SLOTS } from "@/app/config";

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

const LAST_CLASS_KEY = "lastSearchedClass";

export function WhereIsMyClass() {
  const [result, setResult] = useState<ClassLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  // Auto-search last class on mount
  useEffect(() => {
    const lastClass = localStorage.getItem(LAST_CLASS_KEY);
    if (lastClass && !initialSearchDone) {
      setInitialSearchDone(true);
      handleSearch(lastClass);
    }
  }, [initialSearchDone]);

  const handleSearch = async (classCode: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Save to localStorage for next visit
      localStorage.setItem(LAST_CLASS_KEY, classCode);

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
    <div className="space-y-4">
      <ClassSearchForm onSearch={handleSearch} loading={loading} />

      {/* Show Nearest Empty Room after search when result is available */}
      {!loading && !error && result && (
        <>
          {result.classCode && (
            <NearestEmptyRoom
              classCode={result.classCode}
              day={
                result.nextSession?.day ||
                new Date().toLocaleDateString("fr-FR", { weekday: "long" })
              }
              time={
                result.session?.start?.split("-")[0] ||
                result.nextSession?.start?.split("-")[0] ||
                TIME_SLOTS.morningValue
              }
            />
          )}
        </>
      )}

      {loading && <ClassResultSkeleton />}

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {!loading && !error && result && <ClassResults result={result} />}
    </div>
  );
}
