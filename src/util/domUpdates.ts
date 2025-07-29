export type LoadingStage =
  | "initializing"
  | "checking-auth"
  | "loading-notebook"
  | "ready";

// Track whether the loading screen has been removed
let loadingScreenRemoved = false;

export function updateLoadingStage(stage: LoadingStage): void {
  const stageElement = document.getElementById("loading-stage-text");
  if (!stageElement) return;

  const stageText = getStageText(stage);
  stageElement.textContent = stageText;
}

export function removeStaticLoadingScreen(): void {
  // Idempotent - only remove once
  if (loadingScreenRemoved) {
    return;
  }

  const staticScreen = document.getElementById("static-loading-screen");
  if (staticScreen) {
    loadingScreenRemoved = true;
    staticScreen.remove();
    console.debug("Static loading screen removed");
  }
}

export function isLoadingScreenVisible(): boolean {
  return (
    !loadingScreenRemoved && !!document.getElementById("static-loading-screen")
  );
}

function getStageText(stage: LoadingStage): string {
  switch (stage) {
    case "initializing":
      return "Initializing...";
    case "checking-auth":
      return "Checking Authentication...";
    case "loading-notebook":
      return "Loading Notebook...";
    case "ready":
      return "Loading Notebook...";
    default:
      return "Loading...";
  }
}
