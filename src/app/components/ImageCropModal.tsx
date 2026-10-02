"use client";
import { useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedFile } from "@/lib/cropImage";

export function ImageCropModal({
  src, onCancel, onDone,
}: { src: string; onCancel: () => void; onDone: (file: File) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!area) return;
    setBusy(true);
    try {
      onDone(await getCroppedFile(src, area));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, px) => setArea(px)}
        />
      </div>
      <div className="flex flex-col gap-3 bg-white p-4">
        <input
          type="range" min={1} max={3} step={0.05}
          value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-lg bg-skeuo-surface py-2 text-sm font-medium text-skeuo-text">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={busy || !area}
            className="flex-1 rounded-lg bg-skeuo-red py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "Cropping..." : "Crop & Use"}
          </button>
        </div>
      </div>
    </div>
  );
}