/**
 * nlp.ts — BERT-based NLP analysis using sentence transformers.
 *
 * Uses `@huggingface/transformers` (ONNX/WebAssembly, runs in-browser).
 * Model: Xenova/all-MiniLM-L6-v2  (~23 MB, cached after first download)
 *
 * Exports:
 *   runNlpAnalysis(result: AnalysisResult, onProgress?) → enriched AnalysisResult
 */

import { pipeline, env } from "@huggingface/transformers";
import type {
  AnalysisResult,
  ExtractedSentence,
  TermImportance,
  TrendTerm,
  VideoItem,
} from "./types";

// Allow remote model downloads; use browser cache
env.allowRemoteModels = true;
env.useBrowserCache = true;

// ---------------------------------------------------------------------------
// Model singleton
// ---------------------------------------------------------------------------

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipe: any = null;

async function getPipe(onProgress?: (msg: string) => void) {
  if (_pipe) return _pipe;
  onProgress?.("Downloading sentence transformer model…");
  _pipe = await pipeline("feature-extraction", MODEL_ID, {
    dtype: "fp32",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress_callback: (p: any) => {
      if (p?.status === "downloading") {
        const pct = p.progress != null ? `${Math.round(p.progress)}%` : "";
        onProgress?.(`Downloading BERT model ${pct}`);
      }
    },
  });
  return _pipe;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Mean-pool a 2-D tensor (sentences × dim) → 1-D centroid */
function meanPool(matrix: number[][]): number[] {
  if (matrix.length === 0) return [];
  const dim = matrix[0].length;
  const out = new Array<number>(dim).fill(0);
  for (const row of matrix) {
    for (let i = 0; i < dim; i++) out[i] += row[i];
  }
  return out.map((v) => v / matrix.length);
}

// ---------------------------------------------------------------------------
// Sentence tokeniser
// ---------------------------------------------------------------------------

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.split(" ").length >= 4);
}

// ---------------------------------------------------------------------------
// Embed helper — returns float32 rows (one per text)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function embed(pipe: any, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const output = await pipe(texts, { pooling: "mean", normalize: true });
  // output.tolist() gives [[...], [...], ...]
  return output.tolist() as number[][];
}

// ---------------------------------------------------------------------------
// n-gram candidate builder
// ---------------------------------------------------------------------------

const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","it","its","this","that",
  "these","those","i","you","he","she","we","they","me","him","her","us","them",
  "my","your","his","our","their","what","which","who","how","when","where",
  "from","by","as","if","so","not","no","up","out","about","than","more","also",
  "just","all","been","through","during","before","after","above","below","get",
  "got","going","go","like","see","make","know","want","think","come","let","use",
  "your","into","over","new","good","can","some","much","very","here","there",
  "then","now","only","also","well","back","way","even","most","any","her","him",
]);

function buildCandidates(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

  const seen = new Set<string>();
  const out: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    // unigrams
    const uni = tokens[i];
    if (!seen.has(uni)) { seen.add(uni); out.push(uni); }
    // bigrams
    if (i + 1 < tokens.length) {
      const bi = `${tokens[i]} ${tokens[i + 1]}`;
      if (!STOP.has(tokens[i + 1]) && !seen.has(bi)) { seen.add(bi); out.push(bi); }
    }
  }
  return out;
}

/** Count occurrences of a term (case-insensitive) in a body of text */
function countFrequency(term: string, corpus: string): number {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return (corpus.match(re) ?? []).length;
}

// ---------------------------------------------------------------------------
// Sentence extraction
// ---------------------------------------------------------------------------

export async function extractSentences(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe: any,
  videos: VideoItem[],
  comments: Array<{ text: string }>,
  topN = 8
): Promise<ExtractedSentence[]> {
  const tagged: Array<{ text: string; source: ExtractedSentence["source"] }> = [];

  for (const v of videos) {
    for (const s of splitSentences(v.title)) tagged.push({ text: s, source: "title" });
    for (const s of splitSentences(v.description)) tagged.push({ text: s, source: "description" });
  }
  for (const c of comments) {
    for (const s of splitSentences(c.text)) tagged.push({ text: s, source: "comment" });
  }

  if (tagged.length === 0) return [];

  // Embed all sentences + compute centroid
  const texts = tagged.map((t) => t.text);
  const embeddings = await embed(pipe, texts);
  const centroid = meanPool(embeddings);

  const scored = embeddings.map((emb, i) => ({
    ...tagged[i],
    score: parseFloat(cosineSim(emb, centroid).toFixed(4)),
  }));

  // Deduplicate by prefix similarity, take topN
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      const key = s.text.slice(0, 30).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Term importance (KeyBERT-style)
// ---------------------------------------------------------------------------

export async function extractTermImportance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe: any,
  videos: VideoItem[],
  comments: Array<{ text: string }>,
  topN = 20
): Promise<TermImportance[]> {
  // Build full corpus string
  const corpus =
    videos.map((v) => `${v.title}. ${v.description}`).join(" ") +
    " " +
    comments.map((c) => c.text).join(" ");

  // Embed entire corpus as one document
  const [docEmb] = await embed(pipe, [corpus.slice(0, 4000)]); // token limit guard

  // Build & embed candidates
  const candidates = buildCandidates(corpus).slice(0, 300); // cap for performance
  if (candidates.length === 0) return [];

  const candEmbs = await embed(pipe, candidates);

  const scored = candidates.map((term, i) => ({
    term,
    score: parseFloat(cosineSim(candEmbs[i], docEmb).toFixed(4)),
    frequency: countFrequency(term, corpus),
  }));

  return scored
    .filter((t) => t.frequency >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Trend builder
// ---------------------------------------------------------------------------

export function buildTrends(
  videos: VideoItem[],
  terms: TermImportance[]
): TrendTerm[] {
  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0) || 1;

  return terms
    .slice(0, 15)
    .map((t, i) => {
      // sum view counts of videos containing this term
      const viewSum = videos
        .filter((v) =>
          `${v.title} ${v.description}`.toLowerCase().includes(t.term.toLowerCase())
        )
        .reduce((s, v) => s + v.viewCount, 0);

      const viewWeighted = parseFloat(((t.score * viewSum) / totalViews).toFixed(4));
      const momentum: TrendTerm["momentum"] = i < 7 ? "Rising" : "Stable";

      return {
        term: t.term,
        importanceScore: t.score,
        viewWeightedScore: viewWeighted,
        momentum,
      };
    })
    .sort((a, b) => b.viewWeightedScore - a.viewWeightedScore);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runNlpAnalysis(
  result: AnalysisResult,
  onProgress?: (msg: string) => void
): Promise<AnalysisResult> {
  try {
    onProgress?.("Loading sentence transformer…");
    const pipe = await getPipe(onProgress);

    onProgress?.("Extracting key terms…");
    const keyTerms = await extractTermImportance(
      pipe,
      result.topVideos,
      result.topComments,
      20
    );

    onProgress?.("Scoring sentences…");
    const topSentences = await extractSentences(
      pipe,
      result.topVideos,
      result.topComments,
      8
    );

    onProgress?.("Building trend surface…");
    const trends = buildTrends(result.topVideos, keyTerms);

    return {
      ...result,
      nlp: {
        keyTerms,
        topSentences,
        trends,
        modelUsed: MODEL_ID,
      },
    };
  } catch (err) {
    console.error("[NLP] Analysis failed:", err);
    // Return original result without NLP data — non-fatal
    return result;
  }
}
