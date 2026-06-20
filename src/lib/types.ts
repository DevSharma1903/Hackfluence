// Shared TypeScript types for YouTube API data

export interface ChannelSnippet {
  title: string;
  description: string;
  customUrl: string; // e.g. "@mkbhd"
  thumbnailUrl: string;
  publishedAt: string;
  country?: string;
}

export interface ChannelStats {
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface CommentThread {
  commentId: string;
  authorName: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface TopicOpportunity {
  title: string;
  score: number;
  growth: string;
  validation: "Strong" | "Moderate";
  why: string;
  signals: string[];
  tags: string[];
}

export interface AnalysisResult {
  channel: ChannelSnippet;
  stats: ChannelStats;
  topVideos: VideoItem[];
  topComments: CommentThread[]; // from the most popular video
  opportunities: TopicOpportunity[];
  analyzedAt: string;
}
export interface ExtractedSentence {
  text: string;
  score: number;         // cosine sim to doc centroid
  source: "title" | "description" | "comment";
}

export interface TermImportance {
  term: string;
  score: number;         // 0–1 cosine similarity to doc embedding
  frequency: number;     // raw mention count
}

export interface TrendTerm {
  term: string;
  importanceScore: number;
  viewWeightedScore: number;  // importance × relative view share
  momentum: "Rising" | "Stable";
}
