import { useState, useEffect } from "react";
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
  TrendingUp,
  Lightbulb,
  CreditCard,
  Lock,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { analyzeChannel } from "../lib/youtube";
import type { AnalysisResult, DiscoveredTopic } from "../lib/types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Tab = "audience" | "content";
type View = "topics" | "trends" | "recommendations" | "pricing" | "analytics";

const QUIRKY_PHRASES = [
  "Calibrating semantic laser beams…",
  "Mining comments for hidden gems…",
  "Consulting the digital oracle…",
  "Parsing titles at near-lightspeed…",
  "De-noising background radiation…",
  "Organizing clusters in virtual cabinets…",
  "Generating premium content blueprints…",
  "Brewing digital coffee for the transformer…",
  "Extracting viewer vibe vectors…",
];

export default function App() {
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing…");
  const [error, setError] = useState<string | null>(null);
  const [selectedAudienceIdx, setSelectedAudienceIdx] = useState<number>(0);
  const [selectedContentIdx, setSelectedContentIdx] = useState<number>(0);
  const [inputUrl, setInputUrl] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("audience");
  const [activeView, setActiveView] = useState<View>("recommendations");
  const [showPricing, setShowPricing] = useState(false);
  const [quirkyIndex, setQuirkyIndex] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<"free" | "personal" | "lite" | "max">("max");

  const isJerryRigEverything = (url: string) => {
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.includes("jerryrigeverything") ||
      trimmed === "@jerryrigeverything" ||
      trimmed === "jerryrigeverything"
    );
  };

  const getRecommendationLimit = () => {
    switch (currentPlan) {
      case "free": return 3;
      case "personal": return 6;
      case "lite": return 4;
      case "max": return 8;
      default: return 3;
    }
  };

  const [showUpgradeModal, setShowUpgradeModal] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setQuirkyIndex((prev) => (prev + 1) % QUIRKY_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = async (url: string) => {
    if (!url.trim()) return;
    setError(null);

    // Plan check
    if ((currentPlan === "free" || currentPlan === "personal") && !isJerryRigEverything(url)) {
      setShowUpgradeModal("other_creator");
      return;
    }

    setLoading(true);
    setLoadingLabel("Starting…");
    try {
      const limit = currentPlan === "free" ? 10 : currentPlan === "personal" ? 15 : currentPlan === "lite" ? 15 : 30;
      const result = await analyzeChannel(url.trim(), (msg) => setLoadingLabel(msg), undefined, limit);
      setAnalysisData(result);
      setSelectedAudienceIdx(0);
      setSelectedContentIdx(0);
      setActiveTab("audience");
      setActiveView("recommendations");
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
    setActiveView("recommendations");
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

        {/* Navigation Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div className="space-y-1.5">
            <button
              onClick={handleReset}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${!analysisData ? "bg-[#27272a] text-[#fafafa]" : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                }`}
            >
              <Search size={14} />
              Analyze Channel
            </button>
            {analysisData && (
              <>
                <button
                  onClick={() => setActiveView("trends")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${activeView === "trends"
                    ? "bg-[#18181b] text-[#fafafa] border border-[#27272a]/40"
                    : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                    }`}
                >
                  <TrendingUp size={14} />
                  Trends Analysis
                </button>
                <button
                  onClick={() => setActiveView("recommendations")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${activeView === "recommendations"
                    ? "bg-[#18181b] text-[#fafafa] border border-[#27272a]/40"
                    : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                    }`}
                >
                  <Lightbulb size={14} />
                  Recommendations
                </button>
                <button
                  onClick={() => {
                    if (currentPlan === "free") {
                      setShowUpgradeModal("analytics");
                    } else {
                      setActiveView("analytics");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${activeView === "analytics"
                    ? "bg-[#18181b] text-[#fafafa] border border-[#27272a]/40"
                    : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 size={14} />
                    <span>Analytics</span>
                  </div>
                  {currentPlan === "free" && (
                    <Lock size={12} className="text-[#71717a] shrink-0" />
                  )}
                </button>
              </>
            )}

            {/* Pricing Button */}
            <button
              onClick={() => setActiveView("pricing")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${activeView === "pricing"
                ? "bg-[#18181b] text-[#fafafa] border border-[#27272a]/40"
                : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                }`}
            >
              <CreditCard size={14} />
              Pricing Plans
            </button>
          </div>
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
        {loading ? (
          /* Monochrome Mock Status Bar Loading Screen */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#09090b] text-[#fafafa] p-6 text-center animate-in fade-in duration-300">
            <div className="w-64 space-y-4">
              {/* Vague & clean status header */}
              <h3 className="text-xs font-semibold tracking-wider text-[#a1a1aa] uppercase">
                Analyzing Channel
              </h3>
              
              {/* Mock Status Bar */}
              <div className="h-1.5 w-full bg-[#18181b] border border-[#27272a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#fafafa] transition-all duration-500 ease-out rounded-full" 
                  style={{
                    width: `${
                      loadingLabel.toLowerCase().includes("channel") ? 15 :
                      loadingLabel.toLowerCase().includes("video") ? 30 :
                      loadingLabel.toLowerCase().includes("comments") ? 48 :
                      loadingLabel.toLowerCase().includes("model") ? 65 :
                      loadingLabel.toLowerCase().includes("embeddings") ? 80 :
                      loadingLabel.toLowerCase().includes("recommendations") ? 95 :
                      10
                    }%`
                  }}
                />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-mono text-[#a1a1aa] transition-all duration-300">
                  {loadingLabel}
                </p>
                <span className="text-[10px] text-[#71717a] block">
                  Processing metadata and semantic audience signals
                </span>
              </div>
            </div>
          </div>
        ) : activeView === "pricing" ? (
          /* Pricing Screen */
          <div className="flex-1 overflow-y-auto p-12 flex flex-col justify-center items-center bg-[#09090b]">
            <div className="max-w-4xl w-full space-y-12 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa] bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded-full">
                  Pricing Plans
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-[#fafafa]">Transparent Pricing for Creators & Teams</h2>
                <p className="text-sm text-[#a1a1aa] max-w-lg mx-auto leading-relaxed">
                  Select a plan that fits your analysis needs. Unlock semantic intelligence, deep-dive sentiment mappings, and topic trends.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Free Plan */}
                <div className={`p-6 border rounded-lg flex flex-col justify-between hover:border-[#fafafa]/25 transition-all space-y-6 ${currentPlan === "free" ? "bg-[#18181b] border-[#fafafa]" : "bg-[#18181b]/50 border-[#27272a]"
                  }`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-[#fafafa]">Free</h4>
                        <p className="text-[11px] text-[#a1a1aa] mt-1">Basic Breakdown</p>
                      </div>
                      {currentPlan === "free" && (
                        <span className="text-[9px] bg-[#fafafa] text-[#09090b] font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono font-bold text-[#fafafa]">$0</span>
                      <span className="text-xs text-[#a1a1aa]">/ month</span>
                    </div>
                    <ul className="text-xs text-[#a1a1aa] space-y-2 pt-2 border-t border-[#27272a]/60">
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Basic channel analysis</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Limited recent videos</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> 3-4 recommendations</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Trends preview</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPlan("free");
                      setError(null);
                    }}
                    className={`w-full py-2.5 text-xs font-semibold rounded-md transition-all ${currentPlan === "free"
                      ? "bg-[#fafafa] text-[#09090b]"
                      : "bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa]"
                      }`}
                  >
                    Get Free
                  </button>
                </div>

                {/* Personal Plan */}
                <div className={`p-6 border rounded-lg flex flex-col justify-between hover:border-[#fafafa]/25 transition-all space-y-6 ${currentPlan === "personal" ? "bg-[#18181b] border-[#fafafa]" : "bg-[#18181b]/50 border-[#27272a]"
                  }`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-[#fafafa]">Personal</h4>
                        <p className="text-[11px] text-[#a1a1aa] mt-1">Deep Channel Analysis</p>
                      </div>
                      {currentPlan === "personal" && (
                        <span className="text-[9px] bg-[#fafafa] text-[#09090b] font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono font-bold text-[#fafafa]">$5</span>
                      <span className="text-xs text-[#a1a1aa]">/ month</span>
                    </div>
                    <ul className="text-xs text-[#a1a1aa] space-y-2 pt-2 border-t border-[#27272a]/60">
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Everything in Free</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Analytics tab access</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> More videos analyzed</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Deeper insights & recommendations</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPlan("personal");
                      setError(null);
                    }}
                    className={`w-full py-2.5 text-xs font-semibold rounded-md transition-all ${currentPlan === "personal"
                      ? "bg-[#fafafa] text-[#09090b]"
                      : "bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa]"
                      }`}
                  >
                    Get Personal
                  </button>
                </div>

                {/* Universal Lite Plan */}
                <div className={`p-6 border rounded-lg flex flex-col justify-between relative overflow-hidden space-y-6 ${currentPlan === "lite" ? "bg-[#18181b] border-[#fafafa]" : "bg-[#18181b]/50 border-[#27272a]"
                  }`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-[#fafafa]">Universal Lite</h4>
                        <p className="text-[11px] text-[#a1a1aa] mt-1">Cross-Channel Tracking</p>
                      </div>
                      {currentPlan === "lite" ? (
                        <span className="text-[9px] bg-[#fafafa] text-[#09090b] font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                      ) : (
                        <div className="bg-[#fafafa] text-[#09090b] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Best Value
                        </div>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono font-bold text-[#fafafa]">$15</span>
                      <span className="text-xs text-[#a1a1aa]">/ month</span>
                    </div>
                    <ul className="text-xs text-[#a1a1aa] space-y-2 pt-2 border-t border-[#27272a]/60">
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Everything in Personal</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Analyze other creators</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Limited competitor insights</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPlan("lite");
                      setError(null);
                    }}
                    className={`w-full py-2.5 text-xs font-semibold rounded-md transition-all ${currentPlan === "lite"
                      ? "bg-[#fafafa] text-[#09090b]"
                      : "bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa]"
                      }`}
                  >
                    Get Universal Lite
                  </button>
                </div>

                {/* Universal Max Plan */}
                <div className={`p-6 border rounded-lg flex flex-col justify-between hover:border-[#fafafa]/25 transition-all space-y-6 ${currentPlan === "max" ? "bg-[#18181b] border-[#fafafa]" : "bg-[#18181b]/50 border-[#27272a]"
                  }`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-[#fafafa]">Universal Max</h4>
                        <p className="text-[11px] text-[#a1a1aa] mt-1">Full Creator Platform</p>
                      </div>
                      {currentPlan === "max" && (
                        <span className="text-[9px] bg-[#fafafa] text-[#09090b] font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono font-bold text-[#fafafa]">$20</span>
                      <span className="text-xs text-[#a1a1aa]">/ month</span>
                    </div>
                    <ul className="text-xs text-[#a1a1aa] space-y-2 pt-2 border-t border-[#27272a]/60">
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Everything in Universal Lite</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Full creator & competitor analysis</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Full analytics & reports access</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-zinc-400 shrink-0" /> Unlimited recommendations</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPlan("max");
                      setError(null);
                    }}
                    className={`w-full py-2.5 text-xs font-semibold rounded-md transition-all ${currentPlan === "max"
                      ? "bg-[#fafafa] text-[#09090b]"
                      : "bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa]"
                      }`}
                  >
                    Get Universal Max
                  </button>
                </div>
              </div>

              <div className="pt-6 text-center text-xs text-[#a1a1aa] border-t border-[#27272a]/60">
                Secure checkout powered by Stripe. Have questions? <a href="#" className="underline hover:text-[#fafafa]">Contact support</a>
              </div>
            </div>
          </div>
        ) : !analysisData ? (
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
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze(inputUrl)}
                  />
                </div>
                <button
                  onClick={() => handleAnalyze(inputUrl)}
                  className="px-4 py-2.5 bg-[#fafafa] text-[#09090b] text-sm font-semibold rounded-md hover:bg-[#f4f4f5] transition-all flex items-center gap-2 shrink-0"
                >
                  Analyze
                </button>
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

            {/* Dynamic Views based on activeView */}
            {activeView === "topics" && (
              <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Topics List with Tab Switcher */}
                <div className="w-1/3 border-r border-[#27272a] flex flex-col bg-[#09090b]">
                  {/* Tab Switcher */}
                  <div className="grid grid-cols-2 border-b border-[#27272a] p-2 gap-1 bg-[#18181b]/10">
                    <button
                      onClick={() => {
                        setActiveTab("audience");
                      }}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "audience"
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
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "content"
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
                          className={`w-full text-left px-6 py-4 transition-all focus:outline-none ${isActive
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
            )}

            {activeView === "trends" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#09090b]">
                <div className="border-b border-[#27272a] pb-5">
                  <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">Google Trends Validation</h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    Is this recommendation supported by broader public interest? Validate recommendations against external trend signals over the last 90 days. Not predictive forecasts.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {(analysisData.opportunities || [])
                    .filter((opp) => opp.trendData)
                    .map((opp, idx) => (
                      <div key={opp.title + idx} className="p-6 bg-[#18181b]/40 border border-[#27272a] rounded-lg space-y-4 hover:border-[#fafafa]/25 transition-all">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-[#fafafa]">{opp.title}</h3>
                            <p className="text-xs text-[#a1a1aa]">Topic Validation signals</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[10px] text-[#a1a1aa] block uppercase tracking-wider font-semibold">90-Day Growth</span>
                              <span className="text-sm font-mono font-bold text-[#fafafa]">
                                {opp.trendData!.growth > 0 ? "+" : ""}{opp.trendData!.growth}%
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-[#a1a1aa] block uppercase tracking-wider font-semibold">Trend Status</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-[#27272a]/30 text-[#fafafa] border-[#27272a]">
                                {opp.trendData!.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Chart */}
                        <div className="h-48 w-full bg-[#09090b]/40 border border-[#27272a]/60 rounded p-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={opp.trendData!.timeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`colorValue-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#fafafa" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="#fafafa" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="date" tickFormatter={(str) => {
                                try {
                                  const d = new Date(str);
                                  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                } catch {
                                  return str;
                                }
                              }} tick={{ fill: '#71717a', fontSize: 10 }} />
                              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} domain={[0, 100]} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fafafa', fontSize: 11 }} labelStyle={{ color: '#a1a1aa' }} />
                              <Area type="monotone" dataKey="value" stroke="#fafafa" fillOpacity={1} fill={`url(#colorValue-${idx})`} strokeWidth={1.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  {(!analysisData.opportunities || analysisData.opportunities.length === 0) && (
                    <div className="p-6 text-center text-xs text-[#a1a1aa]">
                      Analyze a channel first to see validation trends.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === "recommendations" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#09090b]">
                <div className="border-b border-[#27272a] pb-5">
                  <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">Strategic Creator Recommendations</h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    Actionable content recommendations derived from viewer demand signals and high-performance video gaps.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {(analysisData.opportunities || [])
                    .filter((opp) => opp.evidenceComments?.length > 0 && opp.evidenceVideos?.length > 0)
                    .slice(0, getRecommendationLimit())
                    .map((opp, idx) => (
                      <div
                        key={opp.title + idx}
                        className="p-6 bg-[#18181b]/40 border border-[#27272a] rounded-lg space-y-6 hover:border-[#fafafa]/25 transition-all"
                      >
                        {/* Header: Title and Opportunity Score */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-[#fafafa]">{opp.title}</h3>
                            <p className="text-xs text-[#a1a1aa] font-medium">Topic Recommendation</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa] mb-1">Opportunity Score</span>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-2xl font-mono font-bold text-[#fafafa]">{opp.score}</span>
                              <span className="text-xs text-[#a1a1aa] font-mono">/100</span>
                            </div>
                            {opp.scoreBreakdown && (
                              <div className="text-[9px] text-[#a1a1aa] mt-1.5 text-right font-mono space-y-0.5 border-t border-[#27272a]/40 pt-1">
                                <div>Audience Signal: 35% (val: {opp.scoreBreakdown.audienceSignal ?? opp.scoreBreakdown.audienceStrength})</div>
                                <div>Content Alignment: 25% (val: {opp.scoreBreakdown.contentAlignment ?? opp.scoreBreakdown.contentRelevance})</div>
                                <div>Evidence Strength: 20% (val: {opp.scoreBreakdown.evidenceStrength ?? opp.scoreBreakdown.supportingEvidence})</div>
                                <div>Trend Growth: 20% (val: {opp.scoreBreakdown.trendGrowth ?? 0})</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rationale / Why This Matters */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa] block">Why This Matters</span>
                          <p className="text-xs text-[#e4e4e7] leading-relaxed">{opp.why}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          {/* Supporting Signals */}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa] block">Supporting Signals</span>
                            <ul className="space-y-1.5">
                              {opp.signals.map((sig, sIdx) => (
                                <li key={sIdx} className="text-xs text-[#e4e4e7] flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#fafafa]" />
                                  {sig}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Recommended Video Ideas */}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa] block">Recommended Video Ideas</span>
                            <ul className="space-y-1.5">
                              {opp.suggestedVideos.map((videoTitle, vIdx) => (
                                <li key={vIdx} className="text-xs text-[#e4e4e7] flex items-start gap-2">
                                  <Lightbulb size={13} className="text-[#a1a1aa] shrink-0 mt-0.5" />
                                  <span>{videoTitle}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Evidence-First UI Section */}
                        <div className="border-t border-[#27272a]/60 pt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#fafafa] uppercase tracking-wider">Supporting Evidence</span>
                            <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#27272a]/40 border border-[#27272a] px-2 py-0.5 rounded">
                              Verified Signals
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Audience Signals (Comments) */}
                            <div className="space-y-2">
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa] block">Audience Signals (Comments)</span>
                              <div className="space-y-2">
                                {opp.evidenceComments.map((comment) => (
                                  <div
                                    key={comment.commentId}
                                    className="p-3 bg-[#09090b]/80 border border-[#27272a] rounded-md space-y-1.5"
                                  >
                                    <div className="flex justify-between items-center text-[9px] text-[#a1a1aa]">
                                      <span className="font-semibold text-[#fafafa]">{comment.authorName}</span>
                                      <span>{comment.likeCount} likes</span>
                                    </div>
                                    <p className="text-xs text-[#e4e4e7] leading-relaxed italic">
                                      "{comment.text}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Creator Signals (Related Videos) */}
                            <div className="space-y-2">
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#a1a1aa] block">Creator Signals (Related Videos)</span>
                              <div className="space-y-2">
                                {opp.evidenceVideos.map((video) => (
                                  <div
                                    key={video.videoId}
                                    className="p-3 bg-[#09090b]/80 border border-[#27272a] rounded-md flex flex-col justify-between space-y-2"
                                  >
                                    <div className="space-y-1">
                                      <h5 className="text-xs font-semibold text-[#fafafa] line-clamp-1">{video.title}</h5>
                                      {video.description && (
                                        <p className="text-[10px] text-[#a1a1aa] line-clamp-1">
                                          {video.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-[#27272a]/30 pt-2 text-[9px] text-[#a1a1aa]">
                                      <span>{formatCount(video.viewCount)} views</span>
                                      <a
                                        href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 hover:text-[#fafafa] transition-colors"
                                      >
                                        Watch <ArrowUpRight size={9} />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {(!analysisData.opportunities || analysisData.opportunities.length === 0) && (
                    <div className="p-6 text-center text-xs text-[#a1a1aa]">
                      No recommendations could be generated for this channel currently.
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeView === "analytics" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#09090b]">
                <div className="border-b border-[#27272a] pb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">Creator Intelligence Analytics</h2>
                    <p className="text-xs text-[#a1a1aa] mt-1">
                      Deep-dive intelligence derived from semantic mapping of YouTube uploads and viewer comments.
                    </p>
                  </div>
                  {currentPlan === "personal" && (
                    <span className="text-[10px] bg-[#27272a] text-[#fafafa] border border-[#27272a] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <Sparkles size={10} /> Personal Plan Analytics
                    </span>
                  )}
                  {(currentPlan === "lite" || currentPlan === "max") && (
                    <span className="text-[10px] bg-[#27272a] text-[#fafafa] border border-[#27272a] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <Sparkles size={10} /> Universal Analytics
                    </span>
                  )}
                </div>

                {/* Gated feature overlay/warning for Universal Lite competitor analysis */}
                {currentPlan === "lite" && (
                  <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-md flex items-center justify-between text-xs text-[#fafafa]">
                    <div className="flex items-center gap-2">
                      <Lock size={14} className="text-[#a1a1aa] shrink-0" />
                      <span><strong>Competitor Insights Restricted:</strong> Upgrade to Universal Max to compare this channel against full competitor benchmarks.</span>
                    </div>
                    <button
                      onClick={() => setActiveView("pricing")}
                      className="px-3 py-1 bg-[#fafafa] text-[#09090b] font-semibold rounded text-[11px] hover:bg-[#f4f4f5] transition-colors"
                    >
                      Upgrade to Max
                    </button>
                  </div>
                )}

                {/* Key Metrics cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#18181b]/40 border border-[#27272a] rounded-lg">
                    <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-semibold">Total Videos Analyzed</span>
                    <p className="text-2xl font-mono font-bold text-[#fafafa] mt-1">{analysisData.topVideos.length}</p>
                  </div>
                  <div className="p-4 bg-[#18181b]/40 border border-[#27272a] rounded-lg">
                    <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-semibold">Total Comments Analyzed</span>
                    <p className="text-2xl font-mono font-bold text-[#fafafa] mt-1">{analysisData.nlp?.commentsProcessed ?? 0}</p>
                  </div>
                  <div className="p-4 bg-[#18181b]/40 border border-[#27272a] rounded-lg">
                    <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-semibold">Audience Overlap Score</span>
                    <p className="text-2xl font-mono font-bold text-[#fafafa] mt-1">
                      {Math.round(
                        (analysisData.nlp?.audienceTopics?.length ?? 0) > 0 && (analysisData.nlp?.contentTopics?.length ?? 0) > 0
                          ? 65 + Math.min(25, (analysisData.nlp?.audienceTopics?.length ?? 0) * 4 + (analysisData.nlp?.contentTopics?.length ?? 0) * 3)
                          : 45
                      )}%
                    </p>
                  </div>
                  <div className="p-4 bg-[#18181b]/40 border border-[#27272a] rounded-lg">
                    <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-semibold">Most Discussed Topic</span>
                    <p className="text-sm font-semibold truncate text-[#fafafa] mt-2">
                      {analysisData.nlp?.audienceTopics?.[0]?.name ?? "General Discussion"}
                    </p>
                  </div>
                </div>

                {/* Detailed Analytics widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Topic distribution card list */}
                  <div className="p-6 bg-[#18181b]/30 border border-[#27272a] rounded-lg space-y-4">
                    <h3 className="text-sm font-bold text-[#fafafa] uppercase tracking-wider">Topic Distribution</h3>
                    <div className="space-y-3.5">
                      {/* Mix of content and audience topics */}
                      {contentTopics.slice(0, 4).map((topic, i) => {
                        const totalVideosCount = analysisData.topVideos.length || 1;
                        const pct = Math.max(15, Math.min(95, Math.round((topic.videos.length / totalVideosCount) * 150)));
                        return (
                          <div key={topic.name + i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#e4e4e7] font-medium">{topic.name}</span>
                              <span className="text-[#a1a1aa] font-mono">{topic.videos.length} videos</span>
                            </div>
                            <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                              <div className="h-full bg-[#fafafa] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Audience Interests card */}
                  <div className="p-6 bg-[#18181b]/30 border border-[#27272a] rounded-lg space-y-4">
                    <h3 className="text-sm font-bold text-[#fafafa] uppercase tracking-wider">Top Audience Interests</h3>
                    <div className="space-y-3.5">
                      {audienceTopics.slice(0, 4).map((topic, i) => {
                        const maxComments = Math.max(...audienceTopics.map(t => t.commentCount), 1);
                        const pct = Math.max(10, Math.min(95, Math.round((topic.commentCount / maxComments) * 90)));
                        return (
                          <div key={topic.name + i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#e4e4e7] font-medium">{topic.name}</span>
                              <span className="text-[#a1a1aa] font-mono">{topic.commentCount} mentions</span>
                            </div>
                            <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                              <div className="h-full bg-[#a1a1aa] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top performing videos with engagement statistics */}
                  <div className="p-6 bg-[#18181b]/30 border border-[#27272a] rounded-lg space-y-4">
                    <h3 className="text-sm font-bold text-[#fafafa] uppercase tracking-wider">Top Performing Videos</h3>
                    <div className="divide-y divide-[#27272a] -my-1">
                      {analysisData.topVideos.slice(0, 4).map((video, idx) => (
                        <div key={video.videoId} className="py-3 flex justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-[#fafafa] truncate">{video.title}</h4>
                            <p className="text-[10px] text-[#a1a1aa] mt-0.5">{formatCount(video.viewCount)} views</p>
                          </div>
                          <div className="text-right shrink-0 flex flex-col justify-center">
                            <span className="font-mono text-[#e4e4e7]">{formatCount(video.likeCount)} likes</span>
                            <span className="text-[9px] text-[#a1a1aa] font-mono">{formatCount(video.commentCount)} comments</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation Opportunity Distribution & Momentum */}
                  <div className="p-6 bg-[#18181b]/30 border border-[#27272a] rounded-lg space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-[#fafafa] uppercase tracking-wider">Opportunity Distribution</h3>
                      <p className="text-[11px] text-[#a1a1aa] mt-0.5">Top performing recommendations momentum & score averages</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-md space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-[#a1a1aa] font-semibold">Avg Opportunity Score</span>
                        <p className="text-xl font-bold font-mono text-[#fafafa]">
                          {Math.round(
                            (analysisData.opportunities || []).reduce((acc, opp) => acc + opp.score, 0) /
                            Math.max(1, (analysisData.opportunities || []).length)
                          )}
                        </p>
                      </div>
                      <div className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-md space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-[#a1a1aa] font-semibold">Momentum Summary</span>
                        <span className="text-xs font-bold text-[#fafafa] flex items-center gap-1 mt-1">
                          <TrendingUp size={12} /> Rising
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-semibold block">Opportunity Index</span>
                      <div className="space-y-2">
                        {analysisData.opportunities.slice(0, 3).map((opp, idx) => (
                          <div key={opp.title + idx} className="flex justify-between items-center text-xs">
                            <span className="text-[#fafafa] font-medium truncate max-w-[200px]">{opp.title}</span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-[#a1a1aa]">Score:</span>
                              <span className="font-bold text-[#fafafa]">{opp.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gated Features Upgrade UI Dialog Modal overlay (clean Upgrade Prompts instead of error screens) */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 bg-[#09090b]/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-lg p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-md">
                  <Sparkles size={20} />
                </div>
                <button
                  onClick={() => setShowUpgradeModal(null)}
                  className="text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#fafafa]">
                  {showUpgradeModal === "analytics" && "Unlock Deep Analytics"}
                  {showUpgradeModal === "other_creator" && "Analyze Other Creators"}
                  {showUpgradeModal === "competitor" && "Unlock Competitor Benchmarks"}
                </h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  {showUpgradeModal === "analytics" && "The Creator Intelligence Analytics tab is a premium feature. Upgrade to Personal or above to access overlap scores, detailed topic charts, and video performance metrics."}
                  {showUpgradeModal === "other_creator" && "Analyzing channels other than @JerryRigEverything is restricted on Free and Personal tiers. Upgrade to Universal Lite or Universal Max to research any creator on YouTube."}
                  {showUpgradeModal === "competitor" && "Full competitor analytics, side-by-side overlap scores, and audience share details are reserved for Universal Max subscribers. Get full platform access now."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowUpgradeModal(null)}
                  className="w-full py-2.5 bg-[#27272a] hover:bg-[#27272a]/80 text-xs font-semibold rounded-md text-[#fafafa] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(null);
                    setActiveView("pricing");
                  }}
                  className="w-full py-2.5 bg-[#fafafa] hover:bg-[#f4f4f5] text-xs font-semibold rounded-md text-[#09090b] transition-colors"
                >
                  View Pricing Plans
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
