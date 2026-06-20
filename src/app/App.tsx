import { useState } from "react";
import {
  Search,
  LayoutDashboard,
  Youtube,
  MessageSquare,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Video,
  Layers,
  BookOpen,
  Users,
} from "lucide-react";
import { analyzeChannel } from "../lib/youtube";
import type { AnalysisResult, DiscoveredTopic } from "../lib/types";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Tab = "audience" | "content";

export default function App() {
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing…");
  const [error, setError] = useState<string | null>(null);
  const [selectedAudienceIdx, setSelectedAudienceIdx] = useState<number>(0);
  const [selectedContentIdx, setSelectedContentIdx] = useState<number>(0);
  const [inputUrl, setInputUrl] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("audience");
  const [customGroqKey, setCustomGroqKey] = useState("");

  const handleAnalyze = async (url: string) => {
    if (!url.trim()) return;
    setLoading(true);
    setLoadingLabel("Starting…");
    setError(null);
    try {
      const result = await analyzeChannel(url.trim(), (msg) => setLoadingLabel(msg), customGroqKey);
      setAnalysisData(result);
      setSelectedAudienceIdx(0);
      setSelectedContentIdx(0);
      setActiveTab("audience");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
      setLoadingLabel("Analyzing…");
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setInputUrl("");
    setSelectedAudienceIdx(0);
    setSelectedContentIdx(0);
  };

  const audienceTopics = analysisData?.nlp?.audienceTopics || [];
  const contentTopics = analysisData?.nlp?.contentTopics || [];
  
  const topics = activeTab === "audience" ? audienceTopics : contentTopics;
  const activeTopicIdx = activeTab === "audience" ? selectedAudienceIdx : selectedContentIdx;
  const activeTopic: DiscoveredTopic | undefined = topics[activeTopicIdx];

  const totalTopicsCount = audienceTopics.length + contentTopics.length;

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-[#09090b] border-r border-[#27272a]">
        {/* Brand Header */}
        <div className="px-6 py-6 border-b border-[#27272a] flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#fafafa] flex items-center justify-center text-[#09090b]">
            <Layers size={15} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#fafafa]">Zukunft AI</h1>
            <p className="text-[10px] text-[#a1a1aa] font-medium uppercase tracking-wider">Audience Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={handleReset}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${
              !analysisData ? "bg-[#27272a] text-[#fafafa]" : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
            }`}
          >
            <Search size={14} />
            Analyze Channel
          </button>
          {analysisData && (
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left bg-[#18181b] text-[#fafafa] border border-[#27272a]/40"
            >
              <LayoutDashboard size={14} />
              Topic Overview
            </button>
          )}
        </div>

        {/* Channel Profile Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#09090b]">
          {analysisData ? (
            <div className="flex items-center gap-3 p-1 rounded-md bg-[#18181b] border border-[#27272a]/50">
              {analysisData.channel.thumbnailUrl ? (
                <img
                  src={analysisData.channel.thumbnailUrl}
                  alt={analysisData.channel.title}
                  className="w-8 h-8 rounded-full border border-[#27272a] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-xs font-bold text-[#fafafa]">
                  {analysisData.channel.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#fafafa] truncate">{analysisData.channel.title}</p>
                <p className="text-[10px] text-[#a1a1aa] font-mono">{formatCount(analysisData.stats.subscriberCount)} subscribers</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-1 text-xs text-[#a1a1aa]">
              <div className="w-2 h-2 rounded-full bg-[#27272a] animate-pulse" />
              Ready for analysis
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        {!analysisData ? (
          /* Landing/Analyze Screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full">
            <div className="text-center space-y-4 mb-8">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#27272a] bg-[#18181b] text-xs text-[#a1a1aa]">
                <Layers size={12} className="text-[#fafafa]" />
                Audience Intelligence Platform
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#fafafa]">Analyze Creator Topics</h2>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">
                Discover clean, high-signal topics published by creators and discussed by audiences. Processes metadata and comments locally.
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Youtube
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]"
                  />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://youtube.com/@channel  or  @handle"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-md pl-10 pr-4 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#fafafa] focus:ring-1 focus:ring-[#fafafa] transition-all"
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleAnalyze(inputUrl)}
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={() => handleAnalyze(inputUrl)}
                  disabled={loading || !inputUrl.trim()}
                  className="px-4 py-2.5 bg-[#fafafa] text-[#09090b] text-sm font-semibold rounded-md hover:bg-[#f4f4f5] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{loadingLabel}</span>
                    </>
                  ) : (
                    "Analyze"
                  )}
                </button>
              </div>

              {/* Secure Groq API Key input */}
              <div className="relative">
                <input
                  type="password"
                  value={customGroqKey}
                  onChange={(e) => setCustomGroqKey(e.target.value)}
                  placeholder="Groq API Key (Optional fallback if not set in .env)"
                  className="w-full bg-[#18181b] border border-[#27272a]/70 rounded-md px-3.5 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#fafafa] transition-all"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-md p-3 text-xs text-[#ef4444]">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-12 border-t border-[#27272a] pt-8">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-[#fafafa]">Content Topics</h4>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Derived from titles and descriptions to identify what the creator actually publishes.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-[#fafafa]">Audience Topics</h4>
                <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                  Derived from high-quality discussions and filtered feedback left by the audience.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Screen */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="px-6 py-5 border-b border-[#27272a] bg-[#09090b] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
                  {analysisData.channel.title}
                  <span className="text-xs font-normal text-[#a1a1aa] font-mono bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded">
                    {analysisData.channel.customUrl}
                  </span>
                </h3>
                <p className="text-xs text-[#a1a1aa] mt-0.5">
                  Audience Intelligence Report · Discovered interests from actual audience discussions
                </p>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] text-xs font-medium rounded-md transition-all self-start md:self-auto"
              >
                Analyze Another Channel
              </button>
            </header>

            {/* Metric Row */}
            <section className="grid grid-cols-4 border-b border-[#27272a] bg-[#09090b]/50">
              <div className="px-6 py-4 border-r border-[#27272a] space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa]">Channel Name</span>
                <p className="text-sm font-semibold truncate text-[#fafafa]">{analysisData.channel.title}</p>
              </div>
              <div className="px-6 py-4 border-r border-[#27272a] space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa]">Recent Videos Analyzed</span>
                <p className="text-sm font-mono font-bold text-[#fafafa]">{analysisData.topVideos.length}</p>
              </div>
              <div className="px-6 py-4 border-r border-[#27272a] space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa]">Comments Processed</span>
                <p className="text-sm font-mono font-bold text-[#fafafa]">{analysisData.nlp?.commentsProcessed ?? 0}</p>
              </div>
              <div className="px-6 py-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa]">Topics Discovered</span>
                <p className="text-sm font-mono font-bold text-[#fafafa]">{totalTopicsCount}</p>
              </div>
            </section>

            {/* Split Panel: Topics list (left) + Detailed evidence (right) */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Topics List with Tab Switcher */}
              <div className="w-1/3 border-r border-[#27272a] flex flex-col bg-[#09090b]">
                {/* Tab Switcher */}
                <div className="grid grid-cols-2 border-b border-[#27272a] p-2 gap-1 bg-[#18181b]/10">
                  <button
                    onClick={() => {
                      setActiveTab("audience");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === "audience"
                        ? "bg-[#27272a] text-[#fafafa]"
                        : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]/50"
                    }`}
                  >
                    <Users size={13} />
                    Audience Topics
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("content");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === "content"
                        ? "bg-[#27272a] text-[#fafafa]"
                        : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]/50"
                    }`}
                  >
                    <BookOpen size={13} />
                    Content Topics
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]">
                  {topics.map((topic, index) => {
                    const isActive = index === activeTopicIdx;
                    return (
                      <button
                        key={topic.name}
                        onClick={() => {
                          if (activeTab === "audience") {
                            setSelectedAudienceIdx(index);
                          } else {
                            setSelectedContentIdx(index);
                          }
                        }}
                        className={`w-full text-left px-6 py-4 transition-all focus:outline-none ${
                          isActive
                            ? "bg-[#18181b] border-l-2 border-[#fafafa]"
                            : "hover:bg-[#18181b]/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <span className="text-xs font-bold text-[#fafafa] line-clamp-1">{topic.name}</span>
                          <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#27272a]/40 border border-[#27272a] px-1.5 py-0.5 rounded shrink-0">
                            {activeTab === "audience" ? `${topic.commentCount} comments` : `${topic.videos.length} videos`}
                          </span>
                        </div>
                        {activeTab === "audience" && topic.comments[0] && (
                          <p className="text-[11px] text-[#a1a1aa] line-clamp-2 italic">
                            "{topic.comments[0].text}"
                          </p>
                        )}
                        {activeTab === "content" && topic.videos[0] && (
                          <p className="text-[11px] text-[#a1a1aa] line-clamp-2 italic">
                            "{topic.videos[0].title}"
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {topics.length === 0 && (
                    <div className="p-6 text-center text-xs text-[#a1a1aa]">
                      No supporting topics found in this category.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Selected Topic Details & Evidence */}
              <div className="flex-1 overflow-y-auto bg-[#09090b] flex flex-col">
                {activeTopic ? (
                  <div className="p-6 space-y-6">
                    {/* Topic Title */}
                    <div className="border-b border-[#27272a] pb-5 space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa] bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded-full">
                        {activeTab === "audience" ? "Audience Interest" : "Content Coverage"}
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">{activeTopic.name}</h2>
                    </div>

                    {/* Simple Product Explanation */}
                    <div className="p-4 bg-[#18181b]/40 border border-[#27272a] rounded-md space-y-1">
                      <p className="text-xs text-[#a1a1aa]">
                        {activeTab === "audience"
                          ? "Audience members frequently discuss this topic across multiple comments and videos."
                          : "The creator frequently publishes content covering this topic across multiple videos."}
                      </p>
                    </div>

                    {/* Supporting Comments (Only for Audience tab) */}
                    {activeTab === "audience" && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare size={13} />
                          Supporting Comments
                        </h4>
                        <div className="space-y-2">
                          {activeTopic.comments.map((comment) => (
                            <div
                              key={comment.commentId}
                              className="p-4 bg-[#18181b]/60 border border-[#27272a] rounded-md space-y-1.5"
                            >
                              <div className="flex justify-between items-center text-[10px] text-[#a1a1aa]">
                                <span className="font-semibold text-[#fafafa]">{comment.authorName}</span>
                                <span>{comment.likeCount} likes</span>
                              </div>
                              <p className="text-xs text-[#e4e4e7] leading-relaxed">
                                "{comment.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Videos */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider flex items-center gap-2">
                        <Video size={13} />
                        Related Videos
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeTopic.videos.map((video) => (
                          <div
                            key={video.videoId}
                            className="p-4 bg-[#18181b]/60 border border-[#27272a] rounded-md flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1.5">
                              <h5 className="text-xs font-semibold text-[#fafafa] line-clamp-2">{video.title}</h5>
                              {video.description && (
                                <p className="text-[11px] text-[#a1a1aa] line-clamp-2">
                                  {video.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between border-t border-[#27272a]/50 pt-2 text-[10px] text-[#a1a1aa]">
                              <span>{formatCount(video.viewCount)} views</span>
                              <a
                                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-[#fafafa] transition-colors"
                              >
                                Watch <ArrowUpRight size={10} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-sm text-[#a1a1aa]">
                    Select a topic from the left list to review detailed evidence.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
