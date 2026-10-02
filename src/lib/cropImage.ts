import type { Area } from "react-easy-crop";

export async function getCroppedFile(src: string, area: Area): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

  const size = Math.min(Math.round(area.width), 800); // cap output at 800px
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext("2d")!
    .drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Crop failed"))), "image/jpeg", 0.9)
  );
  return new File([blob], `doctor-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
}