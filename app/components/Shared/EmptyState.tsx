import { SearchX, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  title?: string;
  message: string;
  suggestions?: string[];
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No results found",
  message,
  suggestions = [],
  icon,
}: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <div className="flex justify-center mb-4">
        {icon || <SearchX className="h-16 w-16 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      {suggestions.length > 0 && (
        <div className="mt-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-sm">Suggestions:</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
