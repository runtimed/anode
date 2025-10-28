import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type AiModel, type ModelCapability } from "@runtimed/agent-core";
import { Brain, Eye, LucideIcon, Type, Wrench } from "lucide-react";

const capabilityIconMap = {
  completion: Type,
  tools: Wrench,
  vision: Eye,
  thinking: Brain,
} as const satisfies Record<ModelCapability, LucideIcon>;

const capabilityTooltipMap = {
  completion: "Basic text completion",
  tools: "Function/tool calling",
  vision: "Image understanding",
  thinking: "Chain of thought reasoning",
} as const satisfies Record<ModelCapability, string>;

export function AiCapabilityIcon({
  iconClassName,
  model,
  capability,
}: {
  iconClassName?: string;
  model: AiModel;
  capability: ModelCapability;
}) {
  const Icon = capabilityIconMap[capability];
  return (
    <SimpleTooltip content={capabilityTooltipMap[capability]}>
      <div>
        <Icon
          className={cn(
            iconClassName,
            !model.capabilities.includes(capability) && "opacity-30"
          )}
        />
      </div>
    </SimpleTooltip>
  );
}
