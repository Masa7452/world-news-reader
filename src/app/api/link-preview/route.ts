import { NextResponse } from "next/server";
import { parseLinkPreview } from "@/lib/link-preview";

export const revalidate = 3600; // 1 hour
const FETCH_TIMEOUT = 12_000;

function abortAfter(ms: number) {
  const ac = new AbortController();
  setTimeout(() => ac.abort(), ms);
  return ac;
}

function isSafeHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    // SSRF対策: http/https のみ、プライベートIP/localhost拒否
    const host = u.hostname.toLowerCase();
    const forbidden = ["localhost", "127.0.0.1", "0.0.0.0"];
    if (!["http:", "https:"].includes(u.protocol)) return false;
    if (forbidden.includes(host) || host.endsWith(".local")) return false;
    return true;
  } catch { return false; }
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
    },
    cache: "force-cache",
    next: { revalidate },
    signal: abortAfter(FETCH_TIMEOUT).signal,
  });
  return res;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!isSafeHttpUrl(rawUrl)) {
    return NextResponse.json({ error: "Invalid or unsafe URL" }, { status: 400 });
  }

  try {
    const url = new URL(rawUrl).toString();

    // 1st try: 直fetch
    let res = await fetchHtml(url);

    // HTML以外（PDF/画像等）は弾く（今回はNotion風のため）
    const type = res.headers.get("content-type") || "";
    const isHtml = type.includes("text/html") || type.includes("application/xhtml+xml");

    // ブロック/非HTMLなら r.jina.ai でHTMLレンダリングをフォールバック
    if (!res.ok || !isHtml) {
      const u = new URL(url);
      const proxied = `https://r.jina.ai/http://${u.hostname}${u.pathname}${u.search}`;
      res = await fetch(proxied, { cache: "no-store", signal: abortAfter(FETCH_TIMEOUT).signal });
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });
      }
    }

    const html = await res.text();
    const data = await parseLinkPreview(url, html);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    const error = e as Error;
    const message = error?.name === "AbortError" ? "Upstream timeout" : (error?.message || "Unexpected error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
