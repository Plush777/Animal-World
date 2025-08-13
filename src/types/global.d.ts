interface LoadingUIInterface {
  init(): void;
  setTotalModels(total: number): void;
  onModelLoaded(modelName: string): void;
  onModelProgress(loaded: number, total: number, modelName: string): void;
  forceHide(): void;
  onError(error: any): void;
}

declare global {
  interface Window {
    LoadingUI: LoadingUIInterface;
  }
}

export {};
