import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Sip & Savor Spot";
const EYEBROW = "COFFEE · SNACKS · RICE MEALS";
const TAGLINE = "A cozy al fresco spot in Ibaan, Batangas to slow down, catch up, and sip something good.";

// Vercel OG's documented recipe for pulling a real Google Fonts file at build
// time: the css2 endpoint only serves woff2 to modern user-agents, but satori
// needs ttf/otf, so we spoof an old UA to get a `url(...) format('truetype')`
// rule back, then fetch that URL for the actual font bytes.
async function loadFraunces(weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Fraunces:wght@${weight}&text=${encodeURIComponent(text)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
    }
  ).then((res) => res.text());

  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error("Could not resolve Fraunces font URL");
  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

export default async function Image() {
  const logoBuffer = readFileSync(join(process.cwd(), "public", "logo_sns.jpg"));
  const logoSrc = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;

  let fonts: { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[] = [];
  try {
    const allText = TITLE + EYEBROW + TAGLINE;
    const [bold, regular] = await Promise.all([loadFraunces(600, allText), loadFraunces(400, allText)]);
    fonts = [
      { name: "Fraunces", data: bold, weight: 600, style: "normal" },
      { name: "Fraunces", data: regular, weight: 400, style: "normal" },
    ];
  } catch {
    // Google Fonts unreachable at build time — fall back to satori's default font
    // rather than failing the whole production build over a social-preview image.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2D5A27",
          padding: "80px",
        }}
      >
        <img
          src={logoSrc}
          width={120}
          height={120}
          style={{ borderRadius: "50%", marginBottom: 32 }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontWeight: 400,
            fontSize: 24,
            letterSpacing: 4,
            color: "rgba(249,246,240,0.75)",
            marginBottom: 20,
          }}
        >
          {EYEBROW}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 88,
            color: "#F9F6F0",
            lineHeight: 1.1,
          }}
        >
          {TITLE}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontWeight: 400,
            fontSize: 30,
            color: "rgba(249,246,240,0.8)",
            marginTop: 28,
            maxWidth: 820,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {TAGLINE}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
