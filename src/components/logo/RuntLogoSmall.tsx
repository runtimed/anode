export const RuntLogoSmall: React.FC = () => {
  return (
    <div className="relative h-8 w-8 overflow-hidden sm:h-10 sm:w-10">
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
