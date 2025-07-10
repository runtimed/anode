interface TerminalPlayProps {
  className?: string;
  size?: number;
}

export const TerminalPlay = ({ className, size = 24 }: TerminalPlayProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 6 18 12 9 18" />
    </svg>
  );
};
