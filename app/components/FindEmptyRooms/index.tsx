"use client";

import { useState, useEffect } from "react";
import { RoomSearchForm, SearchParams } from "./RoomSearchForm";
import { ResultsGrid } from "./ResultsGrid";

interface Room {
  roomId: string;
  buildingId: string;
  name: string;
  capacity: number;
  features: string[];
  freeFrom: string;
  freeUntil: string;
  coords?: { lat: number; lng: number };
  isWarning?: boolean; // For FREEWARNING rooms
}

export function FindEmptyRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDay, setInitialDay] = useState<string | undefined>(undefined);
  const [initialTime, setInitialTime] = useState<string | undefined>(undefined);

  // Load available days on mount and detect current day/time
  useEffect(() => {
    fetch("/api/empty")
      .then((r) => r.json())
      .then((json) => {
        const days = json.days || [];
        setAvailableDays(days);

        // Detect current day and time for auto-selection
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Map day of week to French day names
        const dayMap: Record<number, string> = {
          1: "Lundi",
          2: "Mardi",
          3: "Mercredi",
          4: "Jeudi",
          5: "Vendredi",
        };

        const currentDayName = dayMap[dayOfWeek];

        // Find matching day in available days (format: "Lundi 10 Février")
        if (currentDayName && days.length > 0) {
          const matchingDay = days.find((d: string) =>
            d.startsWith(currentDayName)
          );
          if (matchingDay) {
            setInitialDay(matchingDay);
          }
        }

        // Determine time slot based on current time
        const currentMinutes = hours * 60 + minutes;

        // 09:00-12:15 is 540-735 minutes
        // 13:30-16:45 is 810-1005 minutes
        // 13:45-17:00 is 825-1020 minutes (Friday)

        if (currentMinutes >= 540 && currentMinutes < 735) {
          // Morning slot (9:00 AM)
          setInitialTime("09:00");
        } else if (currentMinutes >= 735) {
          // Afternoon slot - depends on if it's Friday
          if (dayOfWeek === 5) {
            setInitialTime("13:45"); // Friday afternoon
          } else {
            setInitialTime("13:30"); // Regular afternoon
          }
        } else {
          // Before 9:00 AM - default to morning slot
          setInitialTime("09:00");
        }
      })
      .catch((err) => setError(String(err)));
  }, []);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("day", params.day);
      searchParams.set("time", params.time);
      if (params.bloc) searchParams.set("building", params.bloc);

      const res = await fetch(`/api/rooms/free?${searchParams.toString()}`);
      const data = await res.json();

      if ((data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      // Transform the data to match our interface
      // Calculate free time based on the selected time slot
      const timeSlots = [
        { start: "09:00", end: "12:15" },
        { start: "13:30", end: "16:45" },
        { start: "13:45", end: "17:00" }, // Friday afternoon slot
      ];
      const selectedSlot =
        timeSlots.find((slot) => slot.start === params.time) || timeSlots[0];

      const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD
      const freeFrom = `${today}T${selectedSlot.start}:00`;
      const freeUntil = `${today}T${selectedSlot.end}:00`;

      // Transform regular free rooms
      const transformedRooms: Room[] = (data.empty || []).map(
        (roomName: string) => ({
          roomId: roomName,
          buildingId: roomName.match(/^[A-Z]+/)?.[0] || roomName.charAt(0), // Extract bloc from room name (e.g., A12 -> A, B1-201 -> B)
          name: roomName,
          capacity: 30, // Default capacity, can be enhanced later
          features: [], // Can be populated from metadata
          freeFrom,
          freeUntil,
          isWarning: false,
        })
      );

      // Transform warning rooms (FREEWARNING - soutenance risk)
      const warningRooms: Room[] = (data.warning || []).map(
        (roomName: string) => ({
          roomId: roomName,
          buildingId: roomName.match(/^[A-Z]+/)?.[0] || roomName.charAt(0),
          name: roomName,
          capacity: 30,
          features: [],
          freeFrom,
          freeUntil,
          isWarning: true,
        })
      );

      setRooms([...transformedRooms, ...warningRooms]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <RoomSearchForm
        onSearch={handleSearch}
        availableDays={availableDays}
        loading={loading}
        initialDay={initialDay}
        initialTime={initialTime}
      />
      <ResultsGrid
        rooms={rooms}
        loading={loading}
        error={error}
        onRetry={() => {
          // Retry with last params if available
          setError(null);
        }}
      />
    </div>
  );
}
