import { cn } from "@/lib/utils";
import { useAddCell } from "@/hooks/useAddCell.js";
import {
  CodeCellButton,
  MarkdownCellButton,
  SqlCellButton,
  AiCellButton,
} from "./CellTypeButtons";
import { CsvUploadButton } from "./CsvUploadButton";
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";

export function CellAdder({
  position,
  className,
}: {
  position: "before" | "after";
  className?: string;
}) {
  const { addCell } = useAddCell();
  const fileUploadFlag = useFeatureFlag("file-upload");
  return (
    <div className={cn("flex justify-center gap-2", className)}>
      <CodeCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "code", position)}
      />
      <MarkdownCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "markdown", position)}
      />
      <SqlCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "sql", position)}
      />
      <AiCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "ai", position)}
      />
      {fileUploadFlag && <CsvUploadButton size="sm" position={position} />}
    </div>
  );
}
