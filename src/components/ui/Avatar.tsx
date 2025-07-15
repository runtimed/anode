import { cva } from "class-variance-authority";

const avatarVariants = cva(
  "flex items-center justify-center rounded-full bg-gray-200 shrink-0",
  {
    variants: {
      size: {
        sm: "size-5 text-[10px]",
        md: "size-8 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export type AvatarSize = NonNullable<
  NonNullable<Parameters<typeof avatarVariants>[0]>["size"]
>;

export function Avatar({
  initials,
  backgroundColor,
  size = "md",
}: {
  initials: string;
  backgroundColor?: string;
  size?: AvatarSize;
}) {
  return (
    <div className={avatarVariants({ size })} style={{ backgroundColor }}>
      <span className="cursor-default font-medium text-black/50">
        {initials}
      </span>
    </div>
  );
}
