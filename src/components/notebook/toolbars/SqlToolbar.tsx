import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface SqlToolbarProps {
  dataConnection: string;
  onDataConnectionChange: (connection: string) => void;
}

export const SqlToolbar: React.FC<SqlToolbarProps> = ({
  dataConnection,
  onDataConnectionChange,
}) => {
  // TODO: Get available data connections from context or props
  const availableConnections: string[] = [];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="h-5 cursor-pointer border-blue-200 bg-blue-50/50 text-xs text-blue-600 hover:opacity-80"
              title={`Data Connection: ${dataConnection}`}
            >
              {dataConnection}
            </Badge>
            <ChevronDown className="text-muted-foreground h-3 w-3" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {availableConnections.length > 0 ? (
            availableConnections.map((connection) => (
              <DropdownMenuItem
                key={connection}
                onClick={() => onDataConnectionChange(connection)}
              >
                {connection}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>No Connections</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
