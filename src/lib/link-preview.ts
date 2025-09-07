import * as cheerio from "cheerio";

export type LinkPreview = {
  url: string;
  canonicalUrl?: string;
  siteName?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  publishedTime?: string;
  authors?: string[];
  embed?: { type: "iframe"; src: string; width?: number; height?: number; allow?: string };
  provider?: "youtube"|"vimeo"|"twitter"|"spotify"|"figma"|"slideshare";
};

export async function parseLinkPreview(url: string, html: string): Promise<LinkPreview> {
  const $ = cheerio.load(html);

  // 基本メタ
  const pick = (sel: string) => $(sel).attr("content") || $(sel).attr("href") || undefined;
  const og = (n: string) => pick(`meta[property="og:${n}"]`);
  const tw = (n: string) => pick(`meta[name="twitter:${n}"]`);

  const canonicalUrl = $('link[rel="canonical"]').attr("href") || url;
  const siteName = og("site_name") || new URL(url).hostname;
  const title = og("title") || $("title").first().text() || tw("title");
  const description = og("description") || tw("description") || $('meta[name="description"]').attr("content");
  const image = og("image") || tw("image");
  const publishedTime = pick('meta[property="article:published_time"]');
  
  // favicon (相対→絶対)
  const fav = $('link[rel="icon"]').attr("href")
        || $('link[rel="shortcut icon"]').attr("href")
        || "/favicon.ico";
  const favicon = absolutize(url, fav);

  // authors from JSON-LD
  const scripts = $('script[type="application/ld+json"]').toArray();
  let authors: string[] | undefined;
  for (const script of scripts) {
    try {
      const json = JSON.parse($(script).html() || "");
      if (json && (json["@type"] === "NewsArticle" || json["@type"] === "Article")) {
        if (json.author) {
          authors = Array.isArray(json.author) 
            ? json.author.map((a: { name?: string } | string) => 
                typeof a === 'object' && a !== null ? a.name || String(a) : String(a))
            : [typeof json.author === 'object' && json.author !== null ? 
                (json.author as { name?: string }).name || String(json.author) : 
                String(json.author)];
        }
        break;
      }
    } catch {
      // ignore
    }
  }

  // oEmbed discovery
  const oembedLink = $('link[type="application/json+oembed"]').attr("href")
                  || $('link[type="text/json+oembed"]').attr("href");
  
  // 既知プロバイダ判定
  const provider = detectProvider(url);
  const embed = buildEmbed(provider, url);

  const data: LinkPreview = {
    url, canonicalUrl, siteName, title, description,
    image: image ? absolutize(url, image) : undefined,
    favicon, publishedTime, authors, provider,
    ...(embed ? { embed } : {}),
  };

  // もし oEmbed が見つかれば width/height などを補足（JSON取得）
  if (!embed && oembedLink) {
    try {
      const res = await fetch(oembedLink);
      if (res.ok) {
        const j = await res.json();
        if (typeof j?.html === "string") {
          // iframe src を抽出（簡易）
          const m = j.html.match(/src="([^"]+)"/i);
          if (m) data.embed = { type: "iframe", src: m[1], width: j.width, height: j.height, allow: "fullscreen" };
        }
      }
    } catch {
      // oEmbed fetch failed, continue without embed
    }
  }

  return data;
}

function detectProvider(u: string): LinkPreview["provider"] | undefined {
  const h = new URL(u).hostname.replace(/^www\./, "");
  if (h.includes("youtube.com") || h === "youtu.be") return "youtube";
  if (h.includes("vimeo.com")) return "vimeo";
  if (h.includes("twitter.com") || h === "x.com") return "twitter";
  if (h.includes("spotify.com")) return "spotify";
  if (h.includes("figma.com")) return "figma";
  if (h.includes("slideshare.net")) return "slideshare";
  return undefined;
}

function buildEmbed(provider: LinkPreview["provider"], url: string): LinkPreview["embed"] {
  if (!provider) return undefined;
  const u = new URL(url);

  switch (provider) {
    case "youtube": {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (!id) return;
      return { type: "iframe", src: `https://www.youtube.com/embed/${id}`, allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" };
    }
    case "vimeo": {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (!id) return;
      return { type: "iframe", src: `https://player.vimeo.com/video/${id}`, allow: "fullscreen; picture-in-picture" };
    }
    case "twitter": {
      // 公式はscript+blockquoteが必要だが、簡易は publish.twitter.com を利用
      return { type: "iframe", src: `https://publish.twitter.com/?query=${encodeURIComponent(url)}&theme=light`, allow: "" };
    }
    case "spotify": return { type: "iframe", src: url.replace("open.spotify.com/", "open.spotify.com/embed/"), allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" };
    case "figma":   return { type: "iframe", src: `https://www.figma.com/embed?embed_host=web&url=${encodeURIComponent(url)}`, allow: "fullscreen" };
    case "slideshare": return { type: "iframe", src: url, allow: "fullscreen" };
    default: return undefined;
  }
}

function absolutize(base: string, maybeRel?: string) {
  if (!maybeRel) return undefined;
  try { return new URL(maybeRel, base).toString(); } catch { return undefined; }
}

