import React from "react";

export const RuntSidebarLogo: React.FC = () => {
  return (
    <div className="relative h-6 w-6 overflow-hidden">
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
