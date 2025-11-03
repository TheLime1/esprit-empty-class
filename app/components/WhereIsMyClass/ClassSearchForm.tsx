"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap } from "lucide-react";

interface ClassSearchFormProps {
  onSearch: (classCode: string) => void;
  loading?: boolean;
}

export function ClassSearchForm({
  onSearch,
  loading = false,
}: Readonly<ClassSearchFormProps>) {
  const [classCode, setClassCode] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) {
      onSearch(classCode.trim());
    }
  };

  return (
    <Card className="p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
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
              placeholder="e.g., 1A1, 2B5, 4SAE11"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              className="flex-1 text-base sm:text-lg"
            />
            <Button
              type="submit"
              disabled={loading || !classCode.trim()}
              className="w-full sm:w-auto"
              size="lg"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Finding..." : "Find"}
            </Button>
          </div>
          
          {/* Quick Access */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Quick Access:</span>
              <span className="text-[10px] text-muted-foreground/60 italic">(the developer is so lazy)</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setClassCode("4SAE11");
                onSearch("4SAE11");
              }}
              disabled={loading}
              className="text-xs"
            >
              4SAE11
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
