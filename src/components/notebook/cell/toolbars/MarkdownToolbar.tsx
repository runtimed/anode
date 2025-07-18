import { Button } from "@/components/ui/button";
import { Edit3, Eye } from "lucide-react";
import React from "react";
// import { Badge } from "@/components/ui/badge";

interface MarkdownToolbarProps {
  onEdit: () => void;
  onPreview: () => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  onEdit,
  onPreview,
}: MarkdownToolbarProps) => {
  return (
    <div className="flex items-center gap-2">
      {/* <Badge
        variant="outline"
        className="h-5 border-gray-200 bg-gray-50/50 text-xs text-gray-600"
        title="Markdown cell"
      >
        markdown
      </Badge> */}
      <Button variant="outline" size="xs" onClick={onEdit}>
        <Edit3 className="size-3" />
      </Button>
      <Button variant="outline" size="xs" title="Preview" onClick={onPreview}>
        <Eye className="size-3" />
      </Button>
    </div>
  );
};
