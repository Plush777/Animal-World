export function appTransition(): void {
  const body = document.body as HTMLElement;

  if (body) {
    document.body.classList.add("transition-active");
  }
}
