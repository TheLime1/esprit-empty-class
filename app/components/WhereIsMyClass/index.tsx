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
  const [selectedTime, setSelectedTime] = useState<string>("current");
  const [selectedDay, setSelectedDay] = useState<string>("today");

  const handleSearch = async (
    classCode: string,
    time?: string,
    day?: string
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let url = `/api/classes/${encodeURIComponent(classCode)}/location`;
      const params = new URLSearchParams();
      // Only add params if they're not the default "current" or "today"
      if (time && time !== "current") params.append("time", time);
      if (day && day !== "today") params.append("day", day);
      if (params.toString()) url += `?${params.toString()}`;

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

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (result?.classCode) {
      handleSearch(result.classCode, time, selectedDay);
    }
  };

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    if (result?.classCode) {
      handleSearch(result.classCode, selectedTime, day);
    }
  };

  return (
    <div>
      <ClassSearchForm
        onSearch={handleSearch}
        loading={loading}
        onTimeChange={handleTimeChange}
        onDayChange={handleDayChange}
        selectedTime={selectedTime}
        selectedDay={selectedDay}
      />

      {loading && <ClassResultSkeleton />}

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {!loading && !error && result && <ClassResults result={result} />}
    </div>
  );
}
