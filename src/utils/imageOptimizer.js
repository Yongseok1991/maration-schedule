export const dataUrlBytes = (dataUrl) => {
  const b64 = String(dataUrl || "").split(",")[1] || "";
  return Math.ceil((b64.length * 3) / 4);
};

export const isHeicFile = (file) => {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
};

export const isSupportedImageFile = (file) => {
  if (!file) return false;
  const t = String(file.type || "").toLowerCase();
  const n = String(file.name || "").toLowerCase();
  return (
    t.startsWith("image/") ||
    isHeicFile(file) ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => n.endsWith(ext))
  );
};

let heicModulePromise;
export const convertHeicToJpegBlob = async (file) => {
  if (!heicModulePromise) heicModulePromise = import("heic2any");
  const mod = await heicModulePromise;
  const heic2anyFn = mod?.default || mod;
  const converted = await heic2anyFn({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(converted) ? converted[0] : converted;
};

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

export const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });

export const optimizeImageFile = async (file, { maxSide = 1800, maxBytes = 900 * 1024 } = {}) => {
  if (!isSupportedImageFile(file)) throw new Error("not-image");

  let sourceBlob = file;
  let sourceType = String(file.type || "").toLowerCase();

  if (isHeicFile(file)) {
    try {
      sourceBlob = await convertHeicToJpegBlob(file);
      sourceType = "image/jpeg";
    } catch {
      throw new Error("heic-convert-failed");
    }
  }

  if (sourceType === "image/gif" || sourceType === "image/svg+xml") return readFileAsDataUrl(sourceBlob);

  const objectUrl = URL.createObjectURL(sourceBlob);
  try {
    const img = await loadImageElement(objectUrl);
    const mimeType = "image/jpeg";
    const minSide = 900;
    let side = maxSide;
    let quality = 0.9;
    let best = "";

    for (let i = 0; i < 7; i += 1) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-context-failed");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL(mimeType, quality);
      best = out;
      if (dataUrlBytes(out) <= maxBytes) return out;
      if (quality > 0.55) {
        quality -= 0.1;
      } else if (side > minSide) {
        side = Math.max(minSide, Math.floor(side * 0.85));
      } else {
        break;
      }
    }

    return best || readFileAsDataUrl(sourceBlob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
