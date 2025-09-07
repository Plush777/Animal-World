export function appMouseoverEvent() {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("mouseover", (e) => {
      const target = e.target as HTMLElement;

      const emojiThumbUp = document.getElementById("emoji-thumb-up") as HTMLElement;
      const emojiClap = document.getElementById("emoji-clap") as HTMLElement;
      const emojiHeart = document.getElementById("emoji-heart");
      const emojiWave = document.getElementById("emoji-wave") as HTMLElement;
      const emojiSmile = document.getElementById("emoji-smile") as HTMLElement;
      const emojiCry = document.getElementById("emoji-cry") as HTMLElement;

      const emojiThumbUpTooltip = document.getElementById("emoji-thumb-up-tooltip") as HTMLElement;
      const emojiClapTooltip = document.getElementById("emoji-clap-tooltip") as HTMLElement;
      const emojiHeartTooltip = document.getElementById("emoji-heart-tooltip") as HTMLElement;
      const emojiWaveTooltip = document.getElementById("emoji-wave-tooltip") as HTMLElement;
      const emojiSmileTooltip = document.getElementById("emoji-smile-tooltip") as HTMLElement;
      const emojiCryTooltip = document.getElementById("emoji-cry-tooltip") as HTMLElement;

      e.stopPropagation();
      // console.log(target);

      if (target === emojiThumbUp) {
        emojiThumbUpTooltip?.classList.add("active");
      }
      if (target === emojiClap && emojiClapTooltip) {
        emojiClapTooltip?.classList.add("active");
      }
      if (target === emojiHeart && emojiHeartTooltip) {
        emojiHeartTooltip?.classList.add("active");
      }
      if (target === emojiWave && emojiWaveTooltip) {
        emojiWaveTooltip?.classList.add("active");
      }
      if (target === emojiSmile && emojiSmileTooltip) {
        emojiSmileTooltip?.classList.add("active");
      }
      if (target === emojiCry && emojiCryTooltip) {
        emojiCryTooltip?.classList.add("active");
      }
    });

    app.addEventListener("mouseout", (e) => {
      const target = e.target as HTMLElement;

      const emojiThumbUp = document.getElementById("emoji-thumb-up") as HTMLElement;
      const emojiClap = document.getElementById("emoji-clap") as HTMLElement;
      const emojiHeart = document.getElementById("emoji-heart");
      const emojiWave = document.getElementById("emoji-wave") as HTMLElement;
      const emojiSmile = document.getElementById("emoji-smile") as HTMLElement;
      const emojiCry = document.getElementById("emoji-cry") as HTMLElement;

      const emojiThumbUpTooltip = document.getElementById("emoji-thumb-up-tooltip") as HTMLElement;
      const emojiClapTooltip = document.getElementById("emoji-clap-tooltip") as HTMLElement;
      const emojiHeartTooltip = document.getElementById("emoji-heart-tooltip") as HTMLElement;
      const emojiWaveTooltip = document.getElementById("emoji-wave-tooltip") as HTMLElement;
      const emojiSmileTooltip = document.getElementById("emoji-smile-tooltip") as HTMLElement;
      const emojiCryTooltip = document.getElementById("emoji-cry-tooltip") as HTMLElement;

      e.stopPropagation();

      if (target === emojiThumbUp && emojiThumbUpTooltip) {
        emojiThumbUpTooltip?.classList.remove("active");
      }
      if (target === emojiClap && emojiClapTooltip) {
        emojiClapTooltip?.classList.remove("active");
      }
      if (target === emojiHeart && emojiHeartTooltip) {
        emojiHeartTooltip?.classList.remove("active");
      }
      if (target === emojiWave && emojiWaveTooltip) {
        emojiWaveTooltip?.classList.remove("active");
      }
      if (target === emojiSmile && emojiSmileTooltip) {
        emojiSmileTooltip?.classList.remove("active");
      }
      if (target === emojiCry && emojiCryTooltip) {
        emojiCryTooltip?.classList.remove("active");
      }
    });
  }
}
