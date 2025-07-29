import type { Plugin } from "vite";

export function injectLoadingScreen(): Plugin {
  return {
    name: "inject-loading-screen",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        // Static HTML loading screen that matches NotebookLoadingScreen styling
        const loadingHTML = `
          <div id="static-loading-screen" style="
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 1);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
          ">
            <div style="text-align: center;">
              <!-- Large layered logo -->
              <div style="
                position: relative;
                margin: 0 auto 2rem auto;
                height: 6rem;
                width: 6rem;
              " class="logo-container">
                <!-- Progressive loading hole -->
                <div id="loading-hole-container" style="
                  position: absolute;
                  left: 37%;
                  top: 63%;
                  width: 119%;
                  height: 119%;
                  transform: translate(-50%, -50%);
                ">
                  <svg width="100%" height="100%" viewBox="0 0 200 200" style="transform-origin: center center; transform: scale(1);">
                    <defs>
                      <filter id="pixelate">
                        <feMorphology operator="erode" radius="2" in="SourceGraphic" result="morphed"/>
                        <feComponentTransfer in="morphed">
                          <feFuncA type="discrete" tableValues="0 1"/>
                        </feComponentTransfer>
                      </filter>
                    </defs>
                    <circle cx="100" cy="100" r="95" fill="#000000" filter="url(#pixelate)"/>
                  </svg>
                </div>

                <img src="/shadow.png" alt="" class="pixel-logo" style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  height: 100%;
                  width: 100%;
                "/>
                <img src="/bunny.png" alt="" class="pixel-logo" style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  height: 100%;
                  width: 100%;
                "/>
                <img src="/runes.png" alt="" class="pixel-logo rune-throb" style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  height: 100%;
                  width: 100%;
                "/>
                <img src="/bracket.png" alt="Runt" class="pixel-logo" style="
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  height: 100%;
                  width: 100%;
                "/>
              </div>

              <!-- Loading text -->
              <div style="
                margin-bottom: 0.5rem;
                font-size: 1.25rem;
                font-weight: 900;
                color: white;
                text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000;
                position: relative;
                z-index: 50;
              " id="loading-stage-text">
                Initializing...
              </div>
            </div>
          </div>
        `;

        // Asset preloading links with high priority
        const preloadLinks = `
          <link rel="preload" href="/bunny.png" as="image" type="image/png" fetchpriority="high">
          <link rel="preload" href="/shadow.png" as="image" type="image/png" fetchpriority="high">
          <link rel="preload" href="/runes.png" as="image" type="image/png" fetchpriority="high">
          <link rel="preload" href="/bracket.png" as="image" type="image/png" fetchpriority="high">
        `;

        // System font stack to prevent font jumping
        const fontCSS = `
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
              margin: 0;
              padding: 0;
            }
            /* Import existing pixel-logo and rune-throb styles */
            .pixel-logo {
              image-rendering: pixelated;
              image-rendering: -moz-crisp-edges;
              image-rendering: crisp-edges;
            }
            @keyframes rune-throb {
              0% {
                opacity: 0.8;
                filter: brightness(1) saturate(1);
              }
              50% {
                opacity: 1;
                filter: brightness(1.3) saturate(1.4) drop-shadow(0 0 4px rgba(147, 51, 234, 0.4));
              }
              100% {
                opacity: 0.9;
                filter: brightness(1.1) saturate(1.2);
              }
            }
            .rune-throb {
              animation: rune-throb 2s ease-in-out infinite alternate;
            }
            @media (min-width: 640px) {
              #static-loading-screen .logo-container {
                height: 8rem !important;
                width: 8rem !important;
              }
              #static-loading-screen #loading-stage-text {
                font-size: 1.5rem !important;
                line-height: 2rem !important;
              }
            }
          </style>
        `;

        // Inject everything into the HTML
        let modifiedHtml = html;

        // Add preload links and CSS to head
        modifiedHtml = modifiedHtml.replace(
          "</head>",
          `${preloadLinks}${fontCSS}</head>`
        );

        // Add loading screen immediately after body opens
        modifiedHtml = modifiedHtml.replace("<body>", `<body>${loadingHTML}`);

        return modifiedHtml;
      },
    },
  };
}
