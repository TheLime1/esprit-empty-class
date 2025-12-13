"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { ThemeToggle } from "./Shared/ThemeToggle";

interface TopTabsProps {
  tabs: { id: string; title: string; icon?: ReactNode; content: ReactNode }[];
  defaultTab?: string;
}

export function TopTabs({ tabs, defaultTab }: Readonly<TopTabsProps>) {
  // Helper to get short titles for mobile
  const getShortTitle = (tabId: string): string => {
    if (tabId === "find-empty") return "Empty Rooms";
    if (tabId === "where-class") return "My Class";
    return "Calendar";
  };

  return (
    <div className="relative">
      {/* Theme toggle in top right corner - hidden on small screens */}
      <div className="hidden sm:block absolute -top-2 right-0 z-10">
        <ThemeToggle />
      </div>

      <Tabs defaultValue={defaultTab || tabs[0]?.id} className="w-full">
        <div className="mb-6 relative">
          {/* Scrollable container for mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 sm:mx-0 px-3 sm:px-0">
            <div className="flex justify-start sm:justify-center min-w-min">
              <TabsList className="inline-flex w-full sm:w-auto">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3"
                  >
                    {tab.icon}
                    {/* Show full title on desktop, short on mobile */}
                    <span className="hidden md:inline">{tab.title}</span>
                    <span className="md:hidden">{getShortTitle(tab.id)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Theme toggle for mobile - below tabs */}
          <div className="sm:hidden absolute -bottom-16 right-0">
            <ThemeToggle />
          </div>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab.content}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Export icon components for easy reuse
export const TabIcons = {
  Search,
  MapPin,
  Calendar,
};
