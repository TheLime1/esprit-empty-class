"use client";

import { TopTabs, TabIcons } from "./components/TopTabs";
import { FindEmptyRooms } from "./components/FindEmptyRooms";
import { WhereIsMyClass } from "./components/WhereIsMyClass";
import { YearCalendar } from "./components/YearCalendar";
import { AcademicTicker } from "./components/Shared/AcademicTicker";
import { Card } from "@/components/ui/card";
import { MAINTENANCE_MODE, RAMADAN_MODE } from "./config";
import { MaintenancePage } from "./components/MaintenancePage";
import { ContributorsFooter } from "./components/ContributorsFooter";
import { DashboardBanner } from "./components/DashboardBanner";
import { ThemeToggle } from "./components/Shared/ThemeToggle";

export default function Home() {
  // Show maintenance page if enabled
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  const tabs = [
    {
      id: "find-empty",
      title: "Find Empty Rooms",
      icon: <TabIcons.Search className="h-4 w-4" />,
      content: <FindEmptyRooms />,
    },
    {
      id: "where-class",
      title: "Where's My Class?",
      icon: <TabIcons.MapPin className="h-4 w-4" />,
      content: <WhereIsMyClass />,
    },
    {
      id: "year-calendar",
      title: "Year Calendar",
      icon: <TabIcons.Calendar className="h-4 w-4" />,
      content: <YearCalendar />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Academic Ticker */}
      <AcademicTicker />

      {/* Theme Toggle - Top Right under ticker */}
      <div className="absolute top-12 right-4 z-40">
        <ThemeToggle />
      </div>

      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <main className="mx-auto max-w-6xl">
          {/* Ramadan Banner */}
          {RAMADAN_MODE && (
            <div className="text-center mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-amber-700 dark:text-amber-300">
                🌙 Ramadan Karim
              </span>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              ESPRIT Classroom Finder
            </h1>
            <p className="text-sm sm:text-base md:text-lg px-4 leading-relaxed">
              <span className="font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Make sure to join ESPRIT Discord server
              </span>{" "}
              <span className="text-muted-foreground">
                to get free drives and courses and get notified about events,
                PFEs and internships
              </span>{" "}
              <a
                href="https://discord.gg/P67qvJp6fW"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors underline decoration-2 underline-offset-2"
              >
                Join Discord
              </a>
            </p>
          </div>

          {/* Main Content Card */}
          <Card className="p-3 sm:p-4 md:p-6 shadow-xl">
            <TopTabs tabs={tabs} defaultTab="find-empty" />
          </Card>

          {/* Footer */}
          <footer className="text-center mt-4 sm:mt-6 md:mt-8 text-xs sm:text-sm text-muted-foreground px-2 space-y-2">
            <p>Data updates weekly • Academic Year 2025/2026</p>
            <p className="flex items-center justify-center gap-2">
              Made with 🍋 by{" "}
              <a
                href="https://github.com/TheLime1"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:text-foreground transition-colors underline"
              >
                Aymen Hmani (TheLime1)
              </a>
            </p>
            <ContributorsFooter />
          </footer>
        </main>
      </div>

      {/* Dashboard Banner - bottom right on desktop */}
      <DashboardBanner />
    </div>
  );
}
