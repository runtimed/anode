import React from "react";
// import { Badge } from "@/components/ui/badge";

interface CodeToolbarProps {}

export const CodeToolbar: React.FC<CodeToolbarProps> = (
  _props: CodeToolbarProps
) => {
  return (
    <div className="flex items-center gap-2">
      {/* <Code className="h-4 w-4" /> */}
      {/* <Badge
        variant="outline"
        className="h-5"
        title={`Language: ${language}, Kernel: ${kernelName}`}
      >
        {language}
      </Badge> */}
    </div>
  );
};
