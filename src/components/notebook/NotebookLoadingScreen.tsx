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
    onRest: () => {
      if (startAnimation) {
        onPortalAnimationComplete?.();
        setTransitioning(true);
        onTransitionComplete?.();
      }
    },
  });

  const bracketSpring = useSpring({
    opacity: startAnimation ? 0 : 1,
    config: { duration: 300 },
    delay: startAnimation ? 300 : 0,
  });

  // Bunny flight animation
  const bunnySpring = useSpring({
    from: {
      transform: "translateX(0vw) scale(1)",
      opacity: 1,
    },
    to: {
      transform: flyingOut
        ? "translateX(200vw) scale(0.5)"
        : "translateX(0vw) scale(1)",
      opacity: flyingOut ? 0 : 1,
    },
    config: { duration: 800, easing: (t) => t },
  });

  // Shadow fade animation
  const shadowSpring = useSpring({
    from: { opacity: 1 },
    to: { opacity: flyingOut ? 0 : 1 },
    config: { duration: 600 },
  });

  // Runes flight animation
  const runesSpring = useSpring({
    from: {
      transform: "translateX(0vw) scale(1)",
      opacity: 1,
    },
    to: {
      transform: flyingOut
        ? "translateX(190vw) scale(0.75)"
        : "translateX(0vw) scale(1)",
      opacity: flyingOut ? 0 : 1,
    },
    config: { duration: 900, easing: (t) => t, delay: 50 },
  });

  // Loading text animation
  const loadingTextSpring = useSpring({
    from: { opacity: 1 },
    to: { opacity: flyingOut ? 0 : 1 },
    config: { duration: 500 },
  });

  // Note: Removed body overflow:hidden to prevent scroll issues
  // The fixed positioning of the loading screen already prevents scrolling

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
    }
  }, [ready, startAnimation]);
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
                <filter id="pixelate-loading-screen">
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
                filter="url(#pixelate-loading-screen)"
              />
            </animated.svg>
          </div>
          <animated.img
            src="/shadow.png"
            alt=""
            className="pixel-logo absolute inset-0 h-full w-full"
            style={shadowSpring}
          />
          <animated.img
            src="/bunny.png"
            alt=""
            className="pixel-logo absolute inset-0 h-full w-full"
            style={bunnySpring}
          />
          <animated.img
            src="/runes.png"
            alt=""
            className="pixel-logo rune-throb absolute inset-0 h-full w-full"
            style={runesSpring}
          />
          <animated.img
            src="/bracket.png"
            alt="Runt"
            className="pixel-logo absolute inset-0 h-full w-full"
            style={bracketSpring}
          />
        </animated.div>

        {/* Loading text */}
        <animated.div
          className="mb-2 text-xl font-black text-white sm:text-2xl"
          style={{
            ...loadingTextSpring,
            textShadow:
              "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000",
            position: "relative",
            zIndex: 50,
          }}
        >
          Loading Notebook
        </animated.div>

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
