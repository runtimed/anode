import React, { useState, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";

interface NotebookLoadingScreenProps {
  stage?: string;
  onTransitionComplete?: () => void;
  onPortalAnimationComplete?: () => void;
  ready?: boolean;
}

export const NotebookLoadingScreen: React.FC<NotebookLoadingScreenProps> = ({
  stage,
  onTransitionComplete,
  onPortalAnimationComplete,
  ready = false,
}) => {
  const [transitioning, setTransitioning] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);
  const [startAnimation, setStartAnimation] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(1);

  // React Spring animations
  const backgroundSpring = useSpring({
    backgroundColor: startAnimation
      ? "rgba(255, 255, 255, 0)"
      : "rgba(255, 255, 255, 1)",
    config: { duration: 800 },
  });

  // Progressive loading hole - grows during app initialization
  const loadingHoleSpring = useSpring({
    transform: `scale(${loadingProgress})`,
    config: { tension: 200, friction: 25 },
  });

  const holeSpring = useSpring({
    from: { transform: "scale(3)" },
    to: async (next) => {
      if (startAnimation) {
        // "Bam" expansion
        await next({ transform: "scale(25)" });
        // Shrink to dot (no opacity fade)
        await next({ transform: "scale(0)" });
      }
    },
    config: { tension: 200, friction: 20 },
  });

  const bracketSpring = useSpring({
    opacity: startAnimation ? 0 : 1,
    config: { duration: 300 },
    delay: startAnimation ? 300 : 0,
  });

  // Prevent scrollbar during animation
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Progressive loading during app initialization
  useEffect(() => {
    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + 0.1;
        return next >= 3 ? 3 : next;
      });
    }, 100);

    return () => {
      clearInterval(progressTimer);
    };
  }, []);

  // Trigger final animation when ready
  useEffect(() => {
    if (ready && !startAnimation) {
      setLoadingProgress(3);
      setStartAnimation(true);
      setFlyingOut(true);

      // Portal animation completes first (expansion + shrink to dot)
      setTimeout(() => {
        onPortalAnimationComplete?.();
      }, 1200);

      // Complete transition after animation
      setTimeout(() => {
        setTransitioning(true);
        onTransitionComplete?.();
      }, 1500);
    }
  }, [ready, startAnimation, onTransitionComplete, onPortalAnimationComplete]);
  if (transitioning) {
    return null; // Let header take over
  }

  return (
    <animated.div
      style={backgroundSpring}
      className="flex min-h-screen items-center justify-center"
    >
      <div className="text-center">
        {/* Large layered logo */}
        <animated.div className="relative mx-auto mb-8 h-24 w-24 sm:h-32 sm:w-32">
          {/* Precisely positioned SVG hole */}
          <div
            className="absolute"
            style={{
              left: "37%",
              top: "63%",
              width: "119%",
              height: "119%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <animated.svg
              width="100%"
              height="100%"
              viewBox="0 0 200 200"
              style={{
                transformOrigin: "center center",
                ...(startAnimation ? holeSpring : loadingHoleSpring),
              }}
            >
              <defs>
                <filter id="pixelate">
                  <feMorphology
                    operator="erode"
                    radius="2"
                    in="SourceGraphic"
                    result="morphed"
                  />
                  <feComponentTransfer in="morphed">
                    <feFuncA type="discrete" tableValues="0 1" />
                  </feComponentTransfer>
                </filter>
              </defs>
              <circle
                cx="100"
                cy="100"
                r="95"
                fill="#000000"
                filter="url(#pixelate)"
              />
            </animated.svg>
          </div>
          <img
            src="/shadow.png"
            alt=""
            className={`pixel-logo absolute inset-0 h-full w-full transition-opacity duration-600 ${flyingOut ? "opacity-0" : ""}`}
          />
          <img
            src="/bunny.png"
            alt=""
            className={`pixel-logo absolute inset-0 h-full w-full transition-all duration-1000 ${flyingOut ? "translate-x-[200vw] scale-50 opacity-0" : ""}`}
          />
          <img
            src="/runes.png"
            alt=""
            className={`pixel-logo rune-throb absolute inset-0 h-full w-full transition-all duration-1200 ${flyingOut ? "translate-x-[220vw] scale-75 opacity-0" : ""}`}
          />
          <animated.img
            src="/bracket.png"
            alt="Runt"
            className="pixel-logo absolute inset-0 h-full w-full"
            style={bracketSpring}
          />
        </animated.div>

        {/* Loading text */}
        <div
          className={`mb-2 text-xl font-black text-white transition-opacity duration-500 sm:text-2xl ${flyingOut ? "opacity-0" : ""}`}
          style={{
            textShadow:
              "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000",
            position: "relative",
            zIndex: 50,
          }}
        >
          Loading Notebook
        </div>

        {/* Stage indicator - only show if provided and meaningful */}
        {stage && stage !== "loading" && !flyingOut && (
          <div className="text-muted-foreground text-sm">
            {stage.charAt(0).toUpperCase() + stage.slice(1)}...
          </div>
        )}
      </div>
    </animated.div>
  );
};
