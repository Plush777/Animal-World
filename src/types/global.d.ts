interface LoadingUIInterface {
  init(): void;
  setTotalModels(total: number): void;
  onModelLoaded(): void;
  onModelProgress(loaded: number, total: number): void;
  forceHide(): void;
  onError(error: string): void;
}

declare global {
  interface Window {
    LoadingUI: LoadingUIInterface;
  }
}

export {};
