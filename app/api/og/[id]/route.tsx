import { ImageResponse } from "next/og";
import { STATUS_LABELS, UUID_RE, formatCount, signaturesWord } from "@/lib/labels";
import type { Status } from "@/lib/types";

export const runtime = "edge";

type Row = {
  title: string;
  event_name: string;
  votes_count: number;
  status: Status;
  organizers: { name: string } | null;
};

async function fetchPetition(id: string): Promise<Row | null> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/petitions?id=eq.${id}&select=title,event_name,votes_count,status,organizers(name)`;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return rows[0] ?? null;
}

// Satori не знает кириллицу из коробки — подгружаем подмножество шрифта под нужный текст
async function loadGoogleFont(family: string, weight: number, text: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)
  ).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!src) throw new Error(`font ${family} not loaded`);
  return (await fetch(src[1])).arrayBuffer();
}

const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new Response("Not found", { status: 404 });

  const p = await fetchPetition(id);
  if (!p) return new Response("Not found", { status: 404 });

  const story = new URL(req.url).searchParams.get("format") === "story";
  const host = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).host;
  const title = trim(p.title, story ? 150 : 100);
  const org = p.organizers?.name ?? "";
  const votes = formatCount(p.votes_count);
  const word = signaturesWord(p.votes_count);
  const status = STATUS_LABELS[p.status];

  const text = [title, p.event_name, org, votes, word, status.label, "ПротоколОрганизатор:Подпишите", host, "…0123456789 "].join("");
  const [display, body] = await Promise.all([
    loadGoogleFont("Unbounded", 700, text),
    loadGoogleFont("Onest", 500, text),
  ]);

  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 630;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: story ? "column" : "row",
          background: "#0F1420",
          color: "#E7EAF2",
          fontFamily: "Onest",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: story ? "120px 80px 80px" : "56px 60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: story ? 40 : 28, color: "#F2B63D" }}>
              Протокол
            </div>
            <div
              style={{
                display: "flex",
                fontSize: story ? 30 : 22,
                color: status.hex,
                border: `2px solid ${status.hex}`,
                borderRadius: 999,
                padding: "6px 18px",
              }}
            >
              {status.label}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: story ? 36 : 22 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Unbounded",
                fontSize: story ? 76 : 50,
                lineHeight: 1.12,
                letterSpacing: -1,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: story ? 38 : 26, color: "#8C95AB" }}>
              <div style={{ display: "flex" }}>{p.event_name}</div>
              {org ? <div style={{ display: "flex" }}>{`Организатор: ${org}`}</div> : null}
            </div>
          </div>
        </div>

        {/* Отрывной «талон» со счётчиком — фирменный элемент */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#F2B63D",
            color: "#0F1420",
            width: story ? "100%" : 340,
            height: story ? 560 : "100%",
            borderLeft: story ? "none" : "8px dashed #0F1420",
            borderTop: story ? "8px dashed #0F1420" : "none",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: story ? 170 : 88, lineHeight: 1 }}>{votes}</div>
          <div style={{ display: "flex", fontSize: story ? 48 : 30 }}>{word}</div>
          <div style={{ display: "flex", marginTop: story ? 40 : 28, fontSize: story ? 34 : 20 }}>{`Подпишите: ${host}`}</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Unbounded", data: display, weight: 700, style: "normal" },
        { name: "Onest", data: body, weight: 500, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=120, s-maxage=300" },
    },
  );
}
