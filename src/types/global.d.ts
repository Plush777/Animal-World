interface LoadingUIInterface {
  init(): void;
  createAndShow(): void;
  setTotalModels(total: number): void;
  onModelLoaded(): void;
  onModelProgress(loaded: number, total: number): void;
  updateProgressText(text: string): void;
  forceHide(): void;
  onError(error: any): void;
}

declare global {
  interface Window {
    LoadingUI: LoadingUIInterface;
  }
}

export {};
