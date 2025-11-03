"use client";

import { RoomCard } from "./RoomCard";
import { RoomResultsSkeleton } from "../Shared/Skeletons";
import { EmptyState } from "../Shared/EmptyState";
import { ErrorState } from "../Shared/ErrorState";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

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

type SortOption = "name" | "capacity" | "features";

export function ResultsGrid({
  rooms,
  loading,
  error,
  onRetry,
}: Readonly<ResultsGridProps>) {
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const sortedRooms = [...rooms].sort((a, b) => {
    switch (sortBy) {
      case "capacity":
        return b.capacity - a.capacity;
      case "features":
        return b.features.length - a.features.length;
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (loading) {
    return <RoomResultsSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (rooms.length === 0) {
    return (
      <EmptyState
        message="No free rooms found for that time."
        suggestions={[
          "Try selecting a different time slot",
          "Remove some feature filters",
          "Lower the capacity requirement",
          "Check another building",
        ]}
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Found{" "}
          <span className="font-semibold text-foreground">{rooms.length}</span>{" "}
          empty room{rooms.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={() => {
              const options: SortOption[] = ["name", "capacity", "features"];
              const currentIndex = options.indexOf(sortBy);
              setSortBy(options[(currentIndex + 1) % options.length]);
            }}
          >
            <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Sort: </span>
            {sortBy}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            <SlidersHorizontal className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
