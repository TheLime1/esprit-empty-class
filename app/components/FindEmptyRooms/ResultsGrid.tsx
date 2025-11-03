"use client";

import { RoomCard } from "./RoomCard";
import { RoomResultsSkeleton } from "../Shared/Skeletons";
import { EmptyState } from "../Shared/EmptyState";
import { ErrorState } from "../Shared/ErrorState";

interface Room {
  roomId: string;
  buildingId: string;
  name: string;
  capacity: number;
  features: string[];
  freeFrom: string;
  freeUntil: string;
  coords?: { lat: number; lng: number };
}

interface ResultsGridProps {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export function ResultsGrid({
  rooms,
  loading,
  error,
  onRetry,
}: Readonly<ResultsGridProps>) {
  const sortedRooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return <RoomResultsSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (rooms.length === 0) {
    return (
      <EmptyState message="No free rooms found for that time. Try selecting a different time slot or building." />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-xs sm:text-sm text-muted-foreground text-center">
        Found{" "}
        <span className="font-semibold text-foreground">{rooms.length}</span>{" "}
        empty room{rooms.length === 1 ? "" : "s"}
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sortedRooms.map((room) => (
          <RoomCard
            key={room.roomId}
            roomId={room.roomId}
            name={room.name}
            building={room.buildingId}
            capacity={room.capacity}
            features={room.features}
            freeFrom={room.freeFrom}
            freeUntil={room.freeUntil}
            coords={room.coords}
            onNavigate={(coords) => {
              window.open(
                `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
                "_blank"
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
