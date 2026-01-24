import { Badge } from "@/components/ui/badge";
import { Wifi } from "lucide-react";

interface RealtimeIndicatorProps {
  isConnected: boolean;
}

export const RealtimeIndicator = ({ isConnected }: RealtimeIndicatorProps) => {
  if (!isConnected) return null;

  return (
    <Badge 
      variant="outline" 
      className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 animate-pulse"
    >
      <Wifi className="h-3 w-3" />
      <span className="text-xs">Live</span>
    </Badge>
  );
};
