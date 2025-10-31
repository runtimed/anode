import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ShareIcon,
  TrashIcon,
  UserRoundXIcon,
  VolumeOffIcon,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { RuntimeHealthIndicator } from "@/components/notebook/RuntimeHealthIndicator";

export function RuntimeActions() {
  const { hasActiveRuntime, runtimeHealth } = useRuntimeHealth();

  return (
    <>
      <RuntimeHealthIndicator showStatus />
      <ButtonGroup>
        <Button size="sm" variant="outline" className="text-xs">
          <Zap />
          Start Runtime
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="!pl-2">
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="[--radius:1rem]">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <VolumeOffIcon />
                Mute Conversation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CheckIcon />
                Mark as Read
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertTriangleIcon />
                Report Conversation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserRoundXIcon />
                Block User
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ShareIcon />
                Share Conversation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CopyIcon />
                Copy Conversation
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">
                <TrashIcon />
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </>
  );
}
