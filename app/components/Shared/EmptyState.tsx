import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No results found",
  message,
  icon,
}: Readonly<EmptyStateProps>) {
  return (
    <Card className="p-8 text-center">
      <div className="flex justify-center mb-4">
        {icon || <SearchX className="h-16 w-16 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
    </Card>
  );
}
