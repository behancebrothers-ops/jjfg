import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 10 }: { rows?: number }) => {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-4 px-4">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="text-left py-4 px-4">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="text-left py-4 px-4">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="text-left py-4 px-4">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="text-right py-4 px-4">
                <Skeleton className="h-4 w-20 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-t">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Skeleton className="h-6 w-20" />
                </td>
                <td className="py-4 px-4">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="py-4 px-4">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
