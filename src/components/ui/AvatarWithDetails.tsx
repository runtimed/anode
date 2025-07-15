import { Avatar } from "./Avatar";

export function AvatarWithDetails({
  image,
  initials,
  title,
  subtitle,
  backgroundColor,
}: {
  initials: string;
  image?: string;
  title: string;
  subtitle?: string;
  backgroundColor?: string;
}) {
  return (
    <div className="flex items-center space-x-2 p-1">
      {image ? (
        <img
          src={image}
          alt={title}
          className="h-8 w-8 rounded-full bg-gray-300"
        />
      ) : (
        <Avatar initials={initials} backgroundColor={backgroundColor} />
      )}
      <div className="hidden text-left sm:block">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
}
