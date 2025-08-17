import React from "react";
import { Link } from "react-router-dom";
import { Users, Clock, User } from "lucide-react";
import { getRunbookVanityUrl } from "../../util/url-utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import type { Runbook } from "../../queries/runbooks";

interface RunbookCardProps {
  runbook: Runbook;
}

export const RunbookCard: React.FC<RunbookCardProps> = ({ runbook }) => {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getPermissionBadgeVariant = (permission: string) => {
    switch (permission) {
      case "OWNER":
        return "default";
      case "WRITER":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Link
      to={getRunbookVanityUrl(runbook.ulid, runbook.title)}
      className="block transition-transform hover:scale-[1.02]"
    >
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 min-h-[2.5rem] text-lg">
              {runbook.title || "Untitled Runbook"}
            </CardTitle>
            <Badge
              variant={getPermissionBadgeVariant(runbook.myPermission)}
              className="shrink-0"
            >
              {runbook.myPermission.toLowerCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3 text-sm text-gray-600">
            {/* Owner */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {runbook.owner.givenName && runbook.owner.familyName
                  ? `${runbook.owner.givenName} ${runbook.owner.familyName}`
                  : "Unknown Owner"}
              </span>
            </div>

            {/* Collaborators count */}
            {runbook.collaborators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {runbook.collaborators.length}{" "}
                  {runbook.collaborators.length === 1
                    ? "collaborator"
                    : "collaborators"}
                </span>
              </div>
            )}

            {/* Last updated */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Updated {formatDate(runbook.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
