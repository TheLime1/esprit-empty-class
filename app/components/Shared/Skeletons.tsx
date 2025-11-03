import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function RoomCardSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-6 w-24 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </Card>
  );
}

export function RoomResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <RoomCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ClassResultSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-8 w-32 mb-4" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-6 w-2/3 mb-4" />
      <Skeleton className="h-10 w-40" />
    </Card>
  );
}
