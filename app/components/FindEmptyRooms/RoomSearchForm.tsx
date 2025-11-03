"use client";

import { useState } from "react";
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

interface RoomSearchFormProps {
  onSearch: (params: SearchParams) => void;
  availableDays?: string[];
  loading?: boolean;
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
}: Readonly<RoomSearchFormProps>) {
  const [day, setDay] = useState<string>(availableDays[0] || "");
  const [time, setTime] = useState<string>("09:00");
  const [bloc, setBloc] = useState<string>("all");

  // Update day when availableDays becomes available
  if (availableDays.length > 0 && !day && availableDays[0]) {
    setDay(availableDays[0]);
  }

  // Check if selected day is Friday (Vendredi) for different time slots
  const isFriday = day.startsWith("Vendredi");

  // Auto-adjust time when switching between Friday and non-Friday
  // If switching to Friday and time is 13:30, change to 13:45
  // If switching from Friday and time is 13:45, change to 13:30
  const handleDayChange = (newDay: string) => {
    const newIsFriday = newDay.startsWith("Vendredi");

    if (newIsFriday && time === "13:30") {
      setTime("13:45"); // Friday afternoon starts at 13:45
    } else if (!newIsFriday && time === "13:45") {
      setTime("13:30"); // Normal days afternoon starts at 13:30
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
        { label: "9:00 AM - 12:15 PM", value: "09:00" },
        { label: "1:45 PM - 5:00 PM", value: "13:45" },
      ]
    : [
        { label: "9:00 AM - 12:15 PM", value: "09:00" },
        { label: "1:30 PM - 4:45 PM", value: "13:30" },
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
                <SelectItem value="I">Bloc I</SelectItem>
                <SelectItem value="J">Bloc J</SelectItem>
                <SelectItem value="K">Bloc K</SelectItem>
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
