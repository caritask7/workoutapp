import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icône d'écran d'accueil iOS (générée au build). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#a3fa00" }}>
        <svg width="140" height="140" viewBox="0 0 32 32">
          <path d="M7 10.5 10.4 22h2.1L16 13.2 19.5 22h2.1L25 10.5h-2.6l-2.1 7.6-3.2-7.6h-2.2l-3.2 7.6-2.1-7.6Z" fill="#112000" />
        </svg>
      </div>
    ),
    size,
  );
}
