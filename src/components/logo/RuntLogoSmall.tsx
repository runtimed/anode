import { cn } from "@/lib/utils";

export const RuntLogoSmall: React.FC<React.ComponentProps<"div">> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        "relative size-8 shrink-0 overflow-hidden sm:size-10",
        className
      )}
    >
      <img
        src="/hole.png"
        alt=""
        className="pixel-logo absolute inset-0 h-full w-full"
      />
      <img
        src="/runes.png"
        alt=""
        className="pixel-logo absolute inset-0 h-full w-full"
      />
      <img
        src="/bunny-sit.png"
        alt=""
        className="pixel-logo absolute inset-0 h-full w-full"
      />
      <img
        src="/bracket.png"
        alt="Runt"
        className="pixel-logo absolute inset-0 h-full w-full"
      />
    </div>
  );
};
