import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  LayoutDashboard,
  TrendingUp,
  Lightbulb,
  ArrowUpRight,
  Youtube,
  MessageSquare,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Activity,
  Zap,
  Globe,
  Users,
  ExternalLink,
  Loader2,
  AlertCircle,
  Brain,
} from "lucide-react";
import { analyzeChannel } from "../lib/youtube";
import type { AnalysisResult } from "../lib/types";

type Screen = "analyze" | "dashboard" | "topics" | "recommendations" | "nlp";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
      : score >= 80
        ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
        : "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return (
    <span
      className={`inline-flex items-center font-mono text-xs font-medium px-2 py-0.5 rounded border ${color}`}
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      {score}
    </span>
  );
}

function StrengthBadge({ strength }: { strength: string }) {
  const isStrong = strength === "Strong" || strength === "High";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${isStrong
          ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/15"
          : "text-amber-400 bg-amber-500/8 border-amber-500/15"
        }`}
    >
      <span
        className={`w-1 h-1 rounded-full ${isStrong ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      {strength}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Analyze Screen
// ---------------------------------------------------------------------------
function AnalyzeScreen({
  onAnalyze,
  loading,
  loadingLabel,
  error,
}: {
  onAnalyze: (url: string) => void;
  loading: boolean;
  loadingLabel: string;
  error: string | null;
}) {
  const [url, setUrl] = useState("");

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-20">
      <div className="w-full max-w-2xl">
        {/* Hero */}
        <div className="mb-12 text-center">

          <h1
            className="text-4xl font-semibold tracking-tight text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Analyze Creator Channel
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Generate an audience intelligence report using live YouTube data —
            video metadata, audience discussions, and trend signals.
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Youtube
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/@creator  or  @handle"
                className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-accent/40 transition-all"
                onKeyDown={(e) => e.key === "Enter" && !loading && onAnalyze(url)}
                disabled={loading}
              />
            </div>
            <button
              onClick={() => onAnalyze(url)}
              disabled={loading || !url.trim()}
              className="px-5 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="truncate max-w-[160px]">{loadingLabel || "Analyzing…"}</span>
                </>
              ) : (
                "Analyze Channel"
              )}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: <Users size={16} />,
              title: "Audience Discussion Analysis",
              desc: "Analyze real comment threads pulled from the channel's top-performing videos.",
            },
            {
              icon: <Activity size={16} />,
              title: "Live Video Intelligence",
              desc: "Fetch live view counts, likes, and titles to identify what's resonating now.",
            },
            {
              icon: <BarChart2 size={16} />,
              title: "Opportunity Scoring",
              desc: "Rank content opportunities using real view and engagement signals.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-card border border-border rounded-xl p-5 group hover:border-accent/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                {card.icon}
              </div>
              <h3
                className="text-sm font-semibold text-foreground mb-1.5"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {card.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Screen
// ---------------------------------------------------------------------------
function DashboardScreen({
  data,
  onViewTopic,
}: {
  data: AnalysisResult;
  onViewTopic: () => void;
}) {
  const { channel, stats, topVideos, opportunities } = data;

  const maxViews = Math.max(...topVideos.map((v) => v.viewCount), 1);
  const interests = topVideos.slice(0, 5).map((v) => ({
    label: v.title.length > 40 ? v.title.slice(0, 40) + "…" : v.title,
    pct: Math.round((v.viewCount / maxViews) * 100),
  }));

  const emerging = opportunities.slice(0, 3).map((o) => ({
    topic: o.title,
    growth: o.growth,
    strength: o.validation,
  }));

  const table = opportunities.slice(0, 5).map((o) => ({
    topic: o.title,
    growth: o.growth,
    validation: o.validation,
    score: o.score,
  }));

  const pipeline = [
    "YouTube Data API",
    "Video Metadata",
    "Comment Threads",
    "Engagement Signals",
    "Opportunity Ranking",
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Audience Intelligence Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {channel.customUrl} · Updated just now
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Analysis complete
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Channel", value: channel.title, mono: false },
          { label: "Subscribers", value: formatCount(stats.subscriberCount), mono: true },
          { label: "Total Videos", value: formatCount(stats.videoCount), mono: true },
          { label: "Total Views", value: formatCount(stats.viewCount), mono: true },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">{card.label}</p>
            <p
              className="font-semibold text-lg leading-tight text-foreground truncate"
              style={card.mono ? { fontFamily: "'DM Mono', monospace" } : {}}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two Column: Interests + Emerging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Interests */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2
            className="text-sm font-semibold text-foreground mb-4"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Top Videos by Views
          </h2>
          <div className="space-y-4">
            {interests.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-foreground truncate max-w-[75%]">{item.label}</span>
                  <span
                    className="text-xs text-muted-foreground ml-2 shrink-0"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {item.pct}%
                  </span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/70 rounded-full transition-all"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emerging Topics */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2
            className="text-sm font-semibold text-foreground mb-4"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Emerging Topics
          </h2>
          <div className="space-y-3">
            {emerging.map((item) => (
              <div
                key={item.topic}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.topic}</p>
                  <p
                    className="text-xs text-emerald-400 mt-0.5"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    Est. Growth {item.growth}
                  </p>
                </div>
                <StrengthBadge strength={item.strength} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunity Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Opportunity Ranking
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Topic", "Est. Growth", "Trend Validation", "Opportunity Score", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-medium text-muted-foreground px-5 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr
                key={row.topic}
                className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors"
              >
                <td className="px-5 py-3.5 text-sm font-medium text-foreground">{row.topic}</td>
                <td
                  className="px-5 py-3.5 text-sm text-emerald-400"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {row.growth}
                </td>
                <td className="px-5 py-3.5">
                  <StrengthBadge strength={row.validation} />
                </td>
                <td className="px-5 py-3.5">
                  <ScoreBadge score={row.score} />
                </td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={onViewTopic}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    View <ArrowUpRight size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Methodology */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2
          className="text-sm font-semibold text-foreground mb-5"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Analysis Methodology
        </h2>
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {pipeline.map((step, i) => (
            <div key={step} className="flex items-center gap-0 shrink-0">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-medium text-center max-w-[120px] leading-snug ${i === 0
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-secondary text-muted-foreground border border-border"
                    }`}
                >
                  {step}
                </div>
              </div>
              {i < pipeline.length - 1 && (
                <ChevronRight size={14} className="text-muted-foreground mx-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          All signals are derived from publicly available YouTube data via the official Data API v3.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topics Screen
// ---------------------------------------------------------------------------
function TopicsScreen({ data }: { data: AnalysisResult }) {
  const { topVideos, topComments, opportunities } = data;
  const topOpp = opportunities[0];
  const topVideo = topVideos[0];

  // Build chart from view counts week-over-week (simulated from available data)
  const chartData = topVideos.slice(0, 8).reverse().map((v, i) => ({
    week: `Wk ${i + 1}`,
    interest: Math.round((v.viewCount / Math.max(...topVideos.map(x => x.viewCount), 1)) * 100),
  }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-foreground">{topOpp?.title ?? "Top Topic"}</span>
        </div>
        <h1
          className="text-2xl font-semibold text-foreground tracking-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {topOpp?.title ?? "Top Video"} Opportunity Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Based on real YouTube engagement data · Top {topVideos.length} videos
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Top Video Views",
            value: topVideo ? formatCount(topVideo.viewCount) : "—",
            sub: topVideo?.title?.slice(0, 30) + "…" ?? "",
            positive: true,
          },
          {
            label: "Top Video Likes",
            value: topVideo ? formatCount(topVideo.likeCount) : "—",
            sub: "Engagement signal",
            positive: true,
          },
          {
            label: "Comments Analyzed",
            value: String(topComments.length),
            sub: "From top video",
            positive: true,
          },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-3">{card.label}</p>
            <p
              className="text-2xl font-semibold text-emerald-400"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            View Interest Timeline
          </h2>
          <span className="text-xs text-muted-foreground">Relative view share · Top videos</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#80808c", fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#80808c", fontFamily: "'DM Mono', monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#141416",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#ededee",
                }}
                cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="interest"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorInterest)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column: Evidence + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Audience Evidence */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2
            className="text-sm font-semibold text-foreground mb-4"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Audience Evidence {topComments.length === 0 && <span className="text-muted-foreground font-normal text-xs">(comments disabled on this video)</span>}
          </h2>
          <div className="space-y-3">
            {topComments.length > 0
              ? topComments.slice(0, 5).map((c) => (
                <div
                  key={c.commentId}
                  className="flex gap-3 py-3 border-b border-border last:border-0"
                >
                  <MessageSquare
                    size={13}
                    className="text-muted-foreground mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{c.authorName}</p>
                    <p
                      className="text-sm text-foreground/80 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: c.text.slice(0, 200) + (c.text.length > 200 ? "…" : "") }}
                    />
                  </div>
                </div>
              ))
              : topVideos.slice(0, 5).map((v) => (
                <div
                  key={v.videoId}
                  className="flex gap-3 py-3 border-b border-border last:border-0"
                >
                  <Youtube size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{v.title}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Sources + Insight */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2
              className="text-sm font-semibold text-foreground mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Data Sources
            </h2>
            <div className="space-y-3">
              {[
                { icon: <Youtube size={13} />, label: "YouTube Data API v3" },
                { icon: <MessageSquare size={13} />, label: "Comment Threads" },
                { icon: <Globe size={13} />, label: "Public Metadata" },
              ].map((src) => (
                <div key={src.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="text-muted-foreground">{src.icon}</span>
                  {src.label}
                </div>
              ))}
            </div>
          </div>

          {topOpp && (
            <div className="bg-accent/8 border border-accent/15 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={13} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                  Key Insight
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{topOpp.why}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendations Screen
// ---------------------------------------------------------------------------
function RecommendationsScreen({ data }: { data: AnalysisResult }) {
  const { opportunities, topVideos } = data;
  const featured = opportunities[0];
  const additional = opportunities.slice(1);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold text-foreground tracking-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Recommended Content Opportunities
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked by real view count and engagement signals from YouTube Data API
        </p>
      </div>

      {/* Featured Recommendation */}
      {featured && (
        <div className="bg-card border border-accent/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/4 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-full px-2.5 py-0.5">
                  Top Recommendation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Opportunity Score</span>
                <span
                  className="text-2xl font-bold text-accent"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {featured.score}
                </span>
              </div>
            </div>

            <h2
              className="text-xl font-semibold text-foreground mb-3"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {featured.title}
            </h2>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{featured.why}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Supporting Signals</p>
                <div className="space-y-1.5">
                  {featured.signals.map((sig) => (
                    <div key={sig} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      {sig}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Related Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {featured.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {topVideos[0] && (
              <a
                href={`https://www.youtube.com/watch?v=${topVideos[0].videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
              >
                View top video <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Additional Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {additional.map((rec) => (
          <div
            key={rec.title}
            className="bg-card border border-border rounded-xl p-5 group hover:border-accent/15 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3
                className="text-sm font-semibold text-foreground pr-4 leading-snug"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {rec.title}
              </h3>
              <ScoreBadge score={rec.score} />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{rec.why}</p>

            <div className="space-y-1.5 mb-4">
              {rec.signals.map((sig) => (
                <div key={sig} className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <div className="w-1 h-1 rounded-full bg-accent/60 shrink-0" />
                  {sig}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {rec.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ExternalLink
                size={12}
                className="text-muted-foreground group-hover:text-accent transition-colors shrink-0"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// NLP Screen
// ---------------------------------------------------------------------------
function NlpScreen({ data }: { data: AnalysisResult }) {
  const nlp = data.nlp;
  if (!nlp) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        NLP analysis not available for this result.
      </div>
    );
  }

  const maxScore = Math.max(...nlp.keyTerms.map((t) => t.score), 0.001);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-accent" />
          <h1
            className="text-2xl font-semibold text-foreground tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            NLP Insights
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Sentence-transformer analysis · model:{" "}
          <span className="font-mono text-xs">{nlp.modelUsed}</span>
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Key Terms", value: String(nlp.keyTerms.length) },
          { label: "Key Sentences", value: String(nlp.topSentences.length) },
          { label: "Trend Terms", value: String(nlp.trends.length) },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">{c.label}</p>
            <p className="text-2xl font-semibold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Key Terms bar chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2
          className="text-sm font-semibold text-foreground mb-4"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Term Importance
          <span className="ml-2 text-xs font-normal text-muted-foreground">(cosine similarity to document embedding)</span>
        </h2>
        <div className="space-y-2.5">
          {nlp.keyTerms.slice(0, 15).map((t) => {
            const pct = Math.round((t.score / maxScore) * 100);
            const tier =
              pct >= 80 ? "bg-indigo-500" : pct >= 55 ? "bg-violet-500" : "bg-slate-500";
            return (
              <div key={t.term}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-foreground capitalize">{t.term}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                      ×{t.frequency}
                    </span>
                    <span className="text-xs font-medium text-foreground/70 w-10 text-right" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {t.score.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tier} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend surface */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Trend Surface
            <span className="ml-2 text-xs font-normal text-muted-foreground">(importance × view share)</span>
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Term", "Importance", "View-Weighted", "Momentum"].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nlp.trends.map((tr) => (
              <tr key={tr.term} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-foreground capitalize">{tr.term}</td>
                <td className="px-5 py-3 text-sm text-foreground/70" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {tr.importanceScore.toFixed(3)}
                </td>
                <td className="px-5 py-3 text-sm text-emerald-400" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {tr.viewWeightedScore.toFixed(4)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                      tr.momentum === "Rising"
                        ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/15"
                        : "text-slate-400 bg-slate-500/8 border-slate-500/15"
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${
                      tr.momentum === "Rising" ? "bg-emerald-400" : "bg-slate-400"
                    }`} />
                    {tr.momentum}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Sentences */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2
          className="text-sm font-semibold text-foreground mb-4"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Most Semantically Central Sentences
        </h2>
        <div className="space-y-3">
          {nlp.topSentences.map((s, i) => {
            const sourceColor =
              s.source === "title"
                ? "text-indigo-400 bg-indigo-500/8 border-indigo-500/15"
                : s.source === "description"
                ? "text-violet-400 bg-violet-500/8 border-violet-500/15"
                : "text-amber-400 bg-amber-500/8 border-amber-500/15";
            return (
              <div
                key={i}
                className="flex gap-3 py-3 border-b border-border last:border-0"
              >
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded border ${sourceColor}`}
                  >
                    {s.source}
                  </span>
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {s.score.toFixed(3)}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{s.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const navItems: { id: Screen; label: string; icon: React.ReactNode }[] = [
  { id: "analyze", label: "Analyze Channel", icon: <Search size={15} /> },
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  { id: "topics", label: "Topic Analysis", icon: <TrendingUp size={15} /> },
  { id: "recommendations", label: "Recommendations", icon: <Lightbulb size={15} /> },
  { id: "nlp", label: "NLP Insights", icon: <Brain size={15} /> },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("analyze");
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing…");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string) => {
    if (!url.trim()) return;
    setLoading(true);
    setLoadingLabel("Starting…");
    setError(null);
    try {
      const result = await analyzeChannel(url.trim(), (msg) => setLoadingLabel(msg));
      setAnalysisData(result);
      setScreen("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
      setLoadingLabel("Analyzing…");
    }
  };

  const handleViewTopic = () => setScreen("topics");

  // Lock data-dependent screens behind having actual data
  const canViewData = analysisData !== null;

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span
              className="text-sm font-semibold text-foreground tracking-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Zukunft AI
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-tight">
            Turning Signals Into Foresight
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = screen === item.id;
            const locked = item.id !== "analyze" && !canViewData;
            return (
              <button
                key={item.id}
                onClick={() => !locked && setScreen(item.id)}
                disabled={locked}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${active
                    ? "bg-accent/10 text-accent font-medium"
                    : locked
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  }`}
              >
                <span className={active ? "text-accent" : locked ? "text-muted-foreground/40" : "text-muted-foreground"}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          {analysisData ? (
            <div className="flex items-center gap-2">
              {analysisData.channel.thumbnailUrl ? (
                <img
                  src={analysisData.channel.thumbnailUrl}
                  alt={analysisData.channel.title}
                  className="w-6 h-6 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground">
                  {analysisData.channel.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{analysisData.channel.customUrl}</p>
                <p className="text-xs text-muted-foreground">{formatCount(analysisData.stats.subscriberCount)} subs</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No channel analyzed yet</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-none">
        {screen === "analyze" && (
          <AnalyzeScreen onAnalyze={handleAnalyze} loading={loading} loadingLabel={loadingLabel} error={error} />
        )}
        {screen === "dashboard" && analysisData && (
          <DashboardScreen data={analysisData} onViewTopic={handleViewTopic} />
        )}
        {screen === "topics" && analysisData && <TopicsScreen data={analysisData} />}
        {screen === "recommendations" && analysisData && (
          <RecommendationsScreen data={analysisData} />
        )}
        {screen === "nlp" && analysisData && <NlpScreen data={analysisData} />}
      </main>
    </div>
  );
}
