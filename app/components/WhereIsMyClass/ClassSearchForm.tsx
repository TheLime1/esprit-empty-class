"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  GraduationCap,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";

interface ClassSearchFormProps {
  onSearch: (classCode: string, time?: string, day?: string) => void;
  loading?: boolean;
  onTimeChange?: (time: string) => void;
  onDayChange?: (day: string) => void;
  selectedTime?: string;
  selectedDay?: string;
}

export function ClassSearchForm({
  onSearch,
  loading = false,
  onTimeChange,
  onDayChange,
  selectedTime = "",
  selectedDay = "",
}: Readonly<ClassSearchFormProps>) {
  const [classCode, setClassCode] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) {
      onSearch(classCode.trim(), selectedTime, selectedDay);
    }
  };

  // Time slots
  const timeSlots = [
    { value: "current", label: "Current Time" },
    { value: "09:00-10:30", label: "09:00 - 10:30" },
    { value: "10:45-12:15", label: "10:45 - 12:15" },
    { value: "13:30-15:00", label: "13:30 - 15:00" },
    { value: "15:15-16:45", label: "15:15 - 16:45" },
  ];

  // Days of week
  const daysOfWeek = [
    { value: "today", label: "Today" },
    { value: "Lundi", label: "Monday" },
    { value: "Mardi", label: "Tuesday" },
    { value: "Mercredi", label: "Wednesday" },
    { value: "Jeudi", label: "Thursday" },
    { value: "Vendredi", label: "Friday" },
    { value: "Samedi", label: "Saturday" },
  ];

  // Quick access to common classes
  const quickClasses = ["1A1", "1A2", "1A3", "2A1", "2A2", "4SAE11"];

  return (
    <Card className="p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="class-input"
              className="flex items-center gap-2 text-base sm:text-lg"
            >
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
              Class / Section Code
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="class-input"
                type="text"
                placeholder="e.g., 1A1, 2B5"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="flex-1 text-base sm:text-lg"
              />
              <Button
                type="submit"
                disabled={loading || !classCode.trim()}
                className="w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Finding..." : "Find"}
              </Button>
            </div>
          </div>

          {/* Time and Day Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-select" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Slot
              </Label>
              <Select value={selectedTime} onValueChange={onTimeChange}>
                <SelectTrigger id="time-select">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day-select" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Day
              </Label>
              <Select value={selectedDay} onValueChange={onDayChange}>
                <SelectTrigger id="day-select">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quick access:
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {quickClasses.map((code) => (
                <Button
                  key={code}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setClassCode(code);
                    onSearch(code, selectedTime, selectedDay);
                  }}
                >
                  {code}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
}
