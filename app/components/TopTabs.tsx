"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface TopTabsProps {
  tabs: { id: string; title: string; icon?: ReactNode; content: ReactNode }[];
  defaultTab?: string;
}

export function TopTabs({ tabs, defaultTab }: Readonly<TopTabsProps>) {
  return (
    <Tabs defaultValue={defaultTab || tabs[0]?.id} className="w-full">
      <div className="flex justify-center mb-6">
        <TabsList className="inline-flex">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2"
            >
              {tab.icon}
              <span>{tab.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>
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
  );
}

// Export icon components for easy reuse
export const TabIcons = {
  Search,
  MapPin,
};
