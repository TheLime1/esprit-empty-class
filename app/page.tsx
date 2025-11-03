"use client";

import { TopTabs, TabIcons } from "./components/TopTabs";
import { FindEmptyRooms } from "./components/FindEmptyRooms";
import { WhereIsMyClass } from "./components/WhereIsMyClass";
import { Card } from "@/components/ui/card";

export default function Home() {
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
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-3 sm:p-4 md:p-6 lg:p-8">
      <main className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            ESPRIT Classroom Finder
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base px-2">
            Find empty classrooms and locate your classes instantly
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="p-3 sm:p-4 md:p-6 shadow-xl">
          <TopTabs tabs={tabs} defaultTab="find-empty" />
        </Card>

        {/* Footer */}
        <footer className="text-center mt-4 sm:mt-6 md:mt-8 text-xs sm:text-sm text-muted-foreground px-2">
          <p>Data updates weekly • Academic Year 2025/2026</p>
        </footer>
      </main>
    </div>
  );
}
