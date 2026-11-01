import { Download, Share2 } from "lucide-react";
import { event } from "./content/event";
import {
  verifiedPublicUrl,
  type PublicWebsite,
} from "./content/public-website";
import { qrDrawing, qrSvg } from "./qr";

export function ShareCode({
  website = event.publicWebsite,
}: {
  website?: PublicWebsite;
}) {
  const url = verifiedPublicUrl(website);
  const drawing = url ? qrDrawing(url) : null;
  return (
    <section className="share-code" aria-labelledby="share-heading">
      <Share2 size={32} aria-hidden="true" />
      <p className="eyebrow">DEEL DE VOORPRET</p>
      <h2 id="share-heading">Een magische dag om te delen.</h2>
      {url && drawing ? (
        <>
          <svg
            className="share-qr"
            viewBox={`0 0 ${drawing.size} ${drawing.size}`}
            width="224"
            height="224"
            role="img"
            aria-label={`QR-code naar ${url}`}
            shapeRendering="crispEdges"
          >
            <rect width="100%" height="100%" fill="white" />
            <path d={drawing.path} fill="#0c293d" />
          </svg>
          <p>Scan de code om de officiële website op je telefoon te openen.</p>
          <a
            className="share-address"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {url}
          </a>
          <a
            className="button button-outline"
            href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(drawing))}`}
            download={`Oosthoek-${event.year}-QR.svg`}
          >
            <Download size={17} aria-hidden="true" />
            QR-code downloaden
          </a>
        </>
      ) : (
        <p>
          Een deelbare QR-code volgt zodra het vaste websiteadres is bevestigd.
        </p>
      )}
    </section>
  );
}
