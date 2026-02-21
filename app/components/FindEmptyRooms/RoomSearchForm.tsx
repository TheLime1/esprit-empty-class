"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Clock, Calendar, Building2 } from "lucide-react";
import { TIME_SLOTS, FRIDAY_AFTERNOON, RAMADAN_MODE } from "@/app/config";

interface RoomSearchFormProps {
  onSearch: (params: SearchParams) => void;
  availableDays?: string[];
  loading?: boolean;
  initialDay?: string;
  initialTime?: string;
}

export interface SearchParams {
  day: string;
  time: string;
  bloc?: string;
}

export function RoomSearchForm({
  onSearch,
  availableDays = [],
  loading = false,
  initialDay,
  initialTime,
}: Readonly<RoomSearchFormProps>) {
  const [day, setDay] = useState<string>("");
  const [time, setTime] = useState<string>(TIME_SLOTS.morningValue);
  const [bloc, setBloc] = useState<string>("all");

  // Track if we've applied initial values to avoid re-applying on every render
  const [hasAppliedInitialDay, setHasAppliedInitialDay] = useState(false);
  const [hasAppliedInitialTime, setHasAppliedInitialTime] = useState(false);

  // Set initial day when it becomes available (only once)
  useEffect(() => {
    if (
      !hasAppliedInitialDay &&
      initialDay &&
      availableDays.includes(initialDay)
    ) {
      setDay(initialDay);
      setHasAppliedInitialDay(true);
    } else if (
      !hasAppliedInitialDay &&
      !initialDay &&
      availableDays.length > 0 &&
      availableDays[0]
    ) {
      // Fallback: if no initialDay but we have available days, use first one
      setDay(availableDays[0]);
      setHasAppliedInitialDay(true);
    }
  }, [initialDay, availableDays, hasAppliedInitialDay]);

  // Set initial time when it becomes available (only once)
  useEffect(() => {
    if (!hasAppliedInitialTime && initialTime) {
      setTime(initialTime);
      setHasAppliedInitialTime(true);
    }
  }, [initialTime, hasAppliedInitialTime]);

  // Check if selected day is Friday (Vendredi) for different time slots
  const isFriday = day.startsWith("Vendredi");

  // Auto-adjust time when switching between Friday and non-Friday
  const handleDayChange = (newDay: string) => {
    const newIsFriday = newDay.startsWith("Vendredi");

    // Friday has a different afternoon time in both modes
    if (newIsFriday && time === TIME_SLOTS.afternoonValue) {
      setTime(FRIDAY_AFTERNOON.value);
    } else if (!newIsFriday && time === FRIDAY_AFTERNOON.value) {
      setTime(TIME_SLOTS.afternoonValue);
    }

    setDay(newDay);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      day,
      time,
      bloc: bloc === "all" ? undefined : bloc,
    });
  };

  const availableTimes = isFriday
    ? [
        { label: TIME_SLOTS.morningLabel, value: TIME_SLOTS.morningValue },
        { label: FRIDAY_AFTERNOON.label, value: FRIDAY_AFTERNOON.value },
      ]
    : [
        { label: TIME_SLOTS.morningLabel, value: TIME_SLOTS.morningValue },
        { label: TIME_SLOTS.afternoonLabel, value: TIME_SLOTS.afternoonValue },
      ];

  return (
    <Card className="p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Main Form Fields */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Day */}
          <div className="space-y-2">
            <Label htmlFor="day-select" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Day
            </Label>
            <Select value={day} onValueChange={handleDayChange}>
              <SelectTrigger id="day-select">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {availableDays.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Slot */}
          <div className="space-y-2">
            <Label htmlFor="time-select" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Slot
            </Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="time-select">
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bloc */}
          <div className="space-y-2">
            <Label htmlFor="bloc-select" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bloc
            </Label>
            <Select value={bloc} onValueChange={setBloc}>
              <SelectTrigger id="bloc-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blocs</SelectItem>
                <SelectItem value="A">Bloc A</SelectItem>
                <SelectItem value="C">Bloc C</SelectItem>
                <SelectItem value="D">Bloc D</SelectItem>
                <SelectItem value="G">Bloc G</SelectItem>
                <SelectItem value="H">Bloc H</SelectItem>
                <SelectItem value="IJK">Bloc IJK</SelectItem>
                <SelectItem value="M">Bloc M</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <Button
          type="submit"
          className="w-full text-sm sm:text-base"
          disabled={loading || !day}
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "Searching..." : "Find Rooms"}
        </Button>
      </form>
    </Card>
  );
}
