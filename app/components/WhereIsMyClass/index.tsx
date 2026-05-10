"use client";

import { useState, useEffect, useCallback } from "react";
import { ClassSearchForm } from "./ClassSearchForm";
import { ClassResults } from "./ClassResults";
import { NearestEmptyRoom } from "./NearestEmptyRoom";
import { ClassResultSkeleton } from "../Shared/Skeletons";
import { ErrorState } from "../Shared/ErrorState";
import {
  getPersistedClassCode,
  usePersistentClassCode,
} from "../Shared/usePersistentClassCode";

interface TimeSlot {
  time: string;
  course: string;
  room: string;
}

interface ClassLocation {
  classCode: string;
  status: "in_session" | "not_in_session" | "no_schedule";
  day?: string;
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
    timeSlot?: string;
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
  const [classCode, setClassCode] = usePersistentClassCode();
  const [result, setResult] = useState<ClassLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  const handleSearch = useCallback(async (classCode: string) => {
    const normalizedClassCode = classCode.trim().toUpperCase();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setClassCode(normalizedClassCode);

      const url = `/api/classes/${encodeURIComponent(normalizedClassCode)}/location`;
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
  }, [setClassCode]);

  // Auto-search last class on mount
  useEffect(() => {
    if (initialSearchDone) {
      return;
    }

    setInitialSearchDone(true);
    const lastClass = getPersistedClassCode();
    if (lastClass) {
      void handleSearch(lastClass);
    }
  }, [handleSearch, initialSearchDone]);

  return (
    <div className="space-y-4">
      <ClassSearchForm
        onSearch={handleSearch}
        loading={loading}
        classCode={classCode}
        onClassCodeChange={setClassCode}
      />

      {/* Show Nearest Empty Room after search when result is available */}
      {!loading && !error && result && (
        <>
          {result.classCode && (
            <NearestEmptyRoom
              classCode={result.classCode}
              day={
                result.day ||
                result.nextSession?.day
              }
              time={
                result.session?.timeSlot?.split("-")[0]?.trim() ||
                result.nextSession?.start?.split("-")[0]?.trim()
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
