import QRCode from "qrcode";

// Vier witte modules rondom de code; geen logo, vervorming of externe QR-dienst.
export function qrDrawing(url: string) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const size = modules.size + 8;
  let path = "";
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.data[row * modules.size + column]) {
        path += `M${column + 4} ${row + 4}h1v1h-1z`;
      }
    }
  }
  return { size, path };
}

export function qrSvg(drawing: ReturnType<typeof qrDrawing>) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${drawing.size} ${drawing.size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${drawing.path}" fill="#0c293d"/></svg>`;
}
