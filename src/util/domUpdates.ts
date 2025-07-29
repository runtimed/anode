export type LoadingStage =
  | "initializing"
  | "checking-auth"
  | "loading-notebook"
  | "ready";

export function updateLoadingStage(stage: LoadingStage): void {
  const stageElement = document.getElementById("loading-stage-text");
  if (!stageElement) return;

  const stageText = getStageText(stage);
  stageElement.textContent = stageText;
}

export function removeStaticLoadingScreen(): void {
  const staticScreen = document.getElementById("static-loading-screen");
  if (staticScreen) {
    staticScreen.remove();
  }
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
