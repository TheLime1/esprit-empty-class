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

  // Load available days on mount
  useEffect(() => {
    fetch("/api/empty")
      .then((r) => r.json())
      .then((json) => {
        setAvailableDays(json.days || []);
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
