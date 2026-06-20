import type {
  ChannelSnippet,
  ChannelStats,
  VideoItem,
  CommentThread,
  AnalysisResult,
  TopicOpportunity,
} from "./types";

const BASE = "https://www.googleapis.com/youtube/v3";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_KEY = (import.meta as any).env?.VITE_YOUTUBE_API_KEY as string | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getKey(): string {
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    throw new Error(
      "YouTube API key not configured. Please set it in your .env file."
    );
  }
  return API_KEY;
}

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = getKey();
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: { message?: string } })?.error?.message ??
      `YouTube API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Channel resolution  (handle / URL / channel ID → channelId)
// ---------------------------------------------------------------------------

function parseChannelInput(input: string): { type: "handle" | "id" | "username"; value: string } {
  const trimmed = input.trim();

  // Full URL patterns
  const urlMatch = trimmed.match(/youtube\.com\/@([\w.-]+)/);
  if (urlMatch) return { type: "handle", value: urlMatch[1] };

  const channelIdMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channelIdMatch) return { type: "id", value: channelIdMatch[1] };

  const userMatch = trimmed.match(/youtube\.com\/user\/([\w.-]+)/);
  if (userMatch) return { type: "username", value: userMatch[1] };

  // Plain @handle
  if (trimmed.startsWith("@")) return { type: "handle", value: trimmed.slice(1) };

  // Raw channel ID
  if (trimmed.startsWith("UC") && trimmed.length >= 24) return { type: "id", value: trimmed };

  // Fallback: treat as handle
  return { type: "handle", value: trimmed };
}

interface YtChannelListResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      publishedAt: string;
      thumbnails?: { medium?: { url: string }; default?: { url: string } };
      country?: string;
    };
    statistics: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
  }>;
}

export async function resolveChannel(
  input: string
): Promise<{ channelId: string; snippet: ChannelSnippet; stats: ChannelStats }> {
  const parsed = parseChannelInput(input);

  let params: Record<string, string> = {
    part: "snippet,statistics",
    maxResults: "1",
  };

  if (parsed.type === "id") {
    params.id = parsed.value;
  } else if (parsed.type === "handle") {
    params.forHandle = parsed.value;
  } else {
    params.forUsername = parsed.value;
  }

  const data = await ytFetch<YtChannelListResponse>("channels", params);

  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found: "${input}". Check the URL or handle and try again.`);
  }

  const item = data.items[0];
  const snippet: ChannelSnippet = {
    title: item.snippet.title,
    description: item.snippet.description,
    customUrl: item.snippet.customUrl ?? `@${parsed.value}`,
    thumbnailUrl:
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url ??
      "",
    publishedAt: item.snippet.publishedAt,
    country: item.snippet.country,
  };

  const stats: ChannelStats = {
    subscriberCount: parseInt(item.statistics.subscriberCount ?? "0", 10),
    videoCount: parseInt(item.statistics.videoCount ?? "0", 10),
    viewCount: parseInt(item.statistics.viewCount ?? "0", 10),
  };

  return { channelId: item.id, snippet, stats };
}

// ---------------------------------------------------------------------------
// Top Videos
// ---------------------------------------------------------------------------

interface YtSearchResponse {
  items?: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails?: { medium?: { url: string }; default?: { url: string } };
    };
  }>;
}

interface YtVideoStatistics {
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
}

interface YtVideoListResponse {
  items?: Array<{
    id: string;
    statistics: YtVideoStatistics;
  }>;
}

export async function getTopVideos(
  channelId: string,
  maxResults = 10
): Promise<VideoItem[]> {
  // search for most-viewed videos on the channel
  const search = await ytFetch<YtSearchResponse>("search", {
    part: "snippet",
    channelId,
    order: "viewCount",
    type: "video",
    maxResults: String(maxResults),
  });

  if (!search.items || search.items.length === 0) return [];

  const videoIds = search.items.map((i) => i.id.videoId).join(",");

  // Fetch statistics for those videos
  const stats = await ytFetch<YtVideoListResponse>("videos", {
    part: "statistics",
    id: videoIds,
  });

  const statsMap = new Map<string, YtVideoStatistics>();
  for (const v of stats.items ?? []) statsMap.set(v.id, v.statistics);

  return search.items.map((item) => {
    const s = statsMap.get(item.id.videoId);
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        "",
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(s?.viewCount ?? "0", 10),
      likeCount: parseInt(s?.likeCount ?? "0", 10),
      commentCount: parseInt(s?.commentCount ?? "0", 10),
    };
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

interface YtCommentThreadsResponse {
  items?: Array<{
    id: string;
    snippet: {
      topLevelComment: {
        id: string;
        snippet: {
          authorDisplayName: string;
          textDisplay: string;
          likeCount: number;
          publishedAt: string;
        };
      };
    };
  }>;
}

export async function getVideoComments(
  videoId: string,
  maxResults = 20
): Promise<CommentThread[]> {
  try {
    const data = await ytFetch<YtCommentThreadsResponse>("commentThreads", {
      part: "snippet",
      videoId,
      order: "relevance",
      maxResults: String(maxResults),
    });

    return (data.items ?? []).map((item) => {
      const c = item.snippet.topLevelComment.snippet;
      return {
        commentId: item.snippet.topLevelComment.id,
        authorName: c.authorDisplayName,
        text: c.textDisplay,
        likeCount: c.likeCount,
        publishedAt: c.publishedAt,
      };
    });
  } catch {
    // Comments disabled on some videos — return empty gracefully
    return [];
  }
}

// ---------------------------------------------------------------------------
// Derive topic opportunities from videos (simple heuristic)
// ---------------------------------------------------------------------------

function deriveOpportunities(videos: VideoItem[]): TopicOpportunity[] {
  if (videos.length === 0) return [];

  const maxViews = Math.max(...videos.map((v) => v.viewCount), 1);

  return videos.slice(0, 5).map((video, i) => {
    const score = Math.round(90 - i * 5);
    const pct = Math.round((video.viewCount / maxViews) * 100);
    const growthPct = Math.max(10, pct - i * 5);
    const validation: "Strong" | "Moderate" = score >= 80 ? "Strong" : "Moderate";

    // Extract short topic name from title (first 3 meaningful words)
    const words = video.title.replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    const shortTitle = words.slice(0, 4).join(" ");

    return {
      title: shortTitle,
      score,
      growth: `+${growthPct}%`,
      validation,
      why: `"${video.title}" is one of the channel's top-performing videos with ${video.viewCount.toLocaleString()} views, indicating strong audience interest.`,
      signals: [
        `${video.viewCount.toLocaleString()} total views`,
        `${video.likeCount.toLocaleString()} likes`,
        video.commentCount > 0 ? `${video.commentCount.toLocaleString()} comments` : "Limited comments",
      ],
      tags: words.slice(0, 4),
    };
  });
}

// ---------------------------------------------------------------------------
// Main analysis entry point
// ---------------------------------------------------------------------------

export async function analyzeChannel(input: string): Promise<AnalysisResult> {
  const { channelId, snippet, stats } = await resolveChannel(input);

  const [topVideos] = await Promise.all([getTopVideos(channelId, 10)]);

  // Get comments from the top video if available
  const topComments: CommentThread[] =
    topVideos.length > 0 ? await getVideoComments(topVideos[0].videoId, 10) : [];

  const opportunities = deriveOpportunities(topVideos);

  return {
    channel: snippet,
    stats,
    topVideos,
    topComments,
    opportunities,
    analyzedAt: new Date().toISOString(),
  };
}
