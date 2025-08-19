export function handleImageUpload(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // 파일 크기 체크
      if (file.size > CONSTANTS.MAX_FILE_SIZE) {
        alert("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
      }

      // FileReader로 이미지 미리보기
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setImageState(imageUrl, true, false);
        updateAllProfileImages(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  input.click();
}

export function handleImageRemove(): void {
  if (confirm("프로필 이미지를 제거하시겠습니까?")) {
    setImageState(svg.defaultImage, false, true);
    updateAllProfileImages(svg.defaultImage);
  }
}
