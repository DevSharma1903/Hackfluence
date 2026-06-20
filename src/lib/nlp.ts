/**
 * nlp.ts — Refined BERT-based NLP analysis with separate pipelines,
 * HTML entity decoding, noise filtering, dynamic pruning, and bigram-based topic naming.
 */

import { pipeline, env } from "@huggingface/transformers";
import type {
  AnalysisResult,
  ExtractedSentence,
  TermImportance,
  TrendTerm,
  VideoItem,
  CommentThread,
  DiscoveredTopic,
} from "./types";

env.allowRemoteModels = true;
env.useBrowserCache = true;

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
// HTML entity decoder
// ---------------------------------------------------------------------------
export function decodeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'");
}

export function cleanHtmlAndTags(text: string): string {
  if (!text) return "";
  // 1. Remove all <a> tags and their inner contents (removes timestamps, URLs, user tags)
  let cleaned = text.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "");
  // 2. Remove all other HTML tags (preserving their text content if any)
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  // 3. Decode html entities
  cleaned = decodeHtml(cleaned);
  // 4. Clean extra spaces
  return cleaned.replace(/\s+/g, " ").trim();
}

export function cleanDescriptionAggressively(text: string): string {
  if (!text) return "";
  const lines = text.split("\n");
  const cleanedLines: string[] = [];

  const badKeywords = [
    "use code",
    "sponsor",
    "thanks to",
    "head to",
    "merch",
    "discount",
    "% off",
    "http",
    "https",
    "subscribe",
    "follow me",
    "check out",
    "link below",
    "amzn.to",
    "bit.ly",
    "geni.us",
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const isBad = badKeywords.some((keyword) => lowerLine.includes(keyword));
    if (!isBad) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join("\n").replace(/\s+/g, " ").trim();
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

function meanPool(matrix: number[][]): number[] {
  if (matrix.length === 0) return [];
  const dim = matrix[0].length;
  const out = new Array<number>(dim).fill(0);
  for (const row of matrix) {
    for (let i = 0; i < dim; i++) out[i] += row[i];
  }
  return out.map((v) => v / matrix.length);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function embed(pipe: any, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const output = await pipe(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

// ---------------------------------------------------------------------------
// Comment Filtering
// ---------------------------------------------------------------------------
const NOISE_PHRASES = [
  "first",
  "w video",
  "bro",
  "bro 💀",
  "great video",
  "amazing video",
  "nice video",
  "love this",
  "good video",
  "keep it up",
  "best channel",
  "underrated",
  "first comment",
  "omg",
  "lmao",
  "lol",
  "nice",
  "cool",
  "wow",
  "fire",
];

export function isNoiseComment(text: string): boolean {
  const decoded = cleanHtmlAndTags(text).trim();
  
  // 1. Extremely short comments (less than 15 chars)
  if (decoded.length < 15) return true;

  const words = decoded.split(/\s+/).filter(Boolean);
  // 2. Too few words
  if (words.length < 3) return true;

  const normalized = decoded.toLowerCase();
  
  // 3. Exact matching generic engagement / spam
  for (const phrase of NOISE_PHRASES) {
    if (normalized === phrase || normalized.startsWith(phrase + " ") || normalized.endsWith(" " + phrase)) {
      return true;
    }
  }

  // 4. Emoji-only / symbol-only checks
  const letterOrDigit = decoded.replace(/[^\p{L}\p{N}]/gu, "");
  if (letterOrDigit.length < 6 || letterOrDigit.length / decoded.length < 0.4) {
    return true; // Mostly emojis, punctuation, or spaces
  }

  return false;
}

// ---------------------------------------------------------------------------
// KMeans Clustering
// ---------------------------------------------------------------------------
function runKMeans(embeddings: number[][], k: number, maxIterations = 25): number[] {
  const n = embeddings.length;
  if (n === 0) return [];
  const d = embeddings[0].length;

  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  
  while (centroids.length < Math.min(k, n)) {
    const idx = Math.floor(Math.random() * n);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      centroids.push([...embeddings[idx]]);
    }
  }

  let assignments = new Array<number>(n).fill(-1);
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCentroid = 0;
      for (let c = 0; c < centroids.length; c++) {
        let dist = 0;
        for (let j = 0; j < d; j++) {
          const diff = embeddings[i][j] - centroids[c][j];
          dist += diff * diff;
        }
        if (dist < minDist) {
          minDist = dist;
          bestCentroid = c;
        }
      }
      if (assignments[i] !== bestCentroid) {
        assignments[i] = bestCentroid;
        changed = true;
      }
    }

    if (!changed) break;

    const newCentroids = Array.from({ length: centroids.length }, () => new Array<number>(d).fill(0));
    const counts = new Array<number>(centroids.length).fill(0);
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let j = 0; j < d; j++) {
        newCentroids[c][j] += embeddings[i][j];
      }
    }

    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < d; j++) {
          newCentroids[c][j] /= counts[c];
        }
        let norm = 0;
        for (let j = 0; j < d; j++) norm += newCentroids[c][j] * newCentroids[c][j];
        norm = Math.sqrt(norm);
        if (norm > 0) {
          for (let j = 0; j < d; j++) newCentroids[c][j] /= norm;
        }
        centroids[c] = newCentroids[c];
      }
    }
  }

  return assignments;
}

const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","about",
  "is","are","was","were","be","been","being","have","has","had","do","does","did",
  "will","would","could","should","may","might","it","its","this","that","these",
  "those","i","you","he","she","we","they","me","him","her","us","them",
  "my","your","his","our","their","what","which","who","how","when","where",
  "from","by","as","if","so","not","no","up","out","than","more","also","just",
  "like","this","video","channel","creator","your","very","good","great","really",
  "love","amazing","think","people","make","would","comment","comments","subscribe",
  "videos","watch","watching","view","views",
]);

const TOPIC_NORMALIZATIONS: Record<string, string> = {
  // Tech / Gear
  "phone": "Smartphones",
  "smartphone": "Smartphones",
  "iphones": "Smartphones",
  "iphone": "Smartphones",
  "android": "Smartphones",
  "laptop": "Laptops",
  "laptops": "Laptops",
  "macbook": "Laptops",
  "macbooks": "Laptops",
  "computer": "Laptops",
  "computers": "Laptops",
  "ev": "Electric Vehicles",
  "evs": "Electric Vehicles",
  "electric vehicle": "Electric Vehicles",
  "electric vehicles": "Electric Vehicles",
  "car": "Electric Vehicles",
  "cars": "Electric Vehicles",
  "tesla": "Electric Vehicles",
  "camera": "Cameras",
  "cameras": "Cameras",
  "lens": "Cameras",
  "lenses": "Cameras",
  "gear": "Camera & Video Gear",
  "ai": "Consumer AI",
  "chatgpt": "Consumer AI",
  "gpt": "Consumer AI",
  "watch": "Smartwatches",
  "smartwatch": "Smartwatches",
  "apple watch": "Smartwatches",

  // DIY / Engineering / Science
  "robot": "Robotics Projects",
  "robots": "Robotics Projects",
  "robotics": "Robotics Projects",
  "walking robot": "Walking Robots",
  "walking robots": "Walking Robots",
  "electronics": "Electronics Builds",
  "circuit": "Electronics Builds",
  "circuits": "Electronics Builds",
  "pcb": "Electronics Builds",
  "pcbs": "Electronics Builds",
  "solder": "Electronics Builds",
  "cad": "Mechanical Design",
  "mechanical": "Mechanical Design",
  "design": "Mechanical Design",
  "print": "3D Printing",
  "3d print": "3D Printing",
  "3d printing": "3D Printing",
  "3d printer": "3D Printing",
  "3d printers": "3D Printing",
  "battery": "Battery Systems",
  "batteries": "Battery Systems",
  "18650": "Battery Systems",
  "cell": "Battery Systems",
  "cells": "Battery Systems",
  "power cell": "Battery Systems",
  "power pack": "Battery Systems",
  "solar": "Solar Power Systems",
  "energy": "Solar Power Systems",
  "cnc": "Digital Fabrication",
  "laser": "Digital Fabrication",
  "laser cutter": "Digital Fabrication",

  // Software / Code
  "github": "Open Source Hardware",
  "code": "Software Engineering",
  "coding": "Software Engineering",
  "software": "Software Engineering",
  "programming": "Software Engineering",
  "python": "Software Engineering",
  
  // general feedback / requests
  "request": "Product Requests",
  "requests": "Product Requests",
  "suggest": "Product Requests",
  "suggestion": "Product Requests",
  "suggestions": "Product Requests",
  "question": "Technical Discussion",
  "questions": "Technical Discussion",
  "help": "Technical Discussion",
  "tutorial": "Technical Discussion",
};

function cleanTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function generateTopicLabel(texts: string[], allTexts: string[]): string {
  // 1. Find top distinctive bigram (2-word phrases)
  const getBigrams = (docs: string[]) => {
    const freqs: Record<string, number> = {};
    for (const doc of docs) {
      const words = doc
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);
      
      for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i];
        const w2 = words[i + 1];
        if (!STOP.has(w1) && !STOP.has(w2)) {
          const bigram = `${w1} ${w2}`;
          freqs[bigram] = (freqs[bigram] || 0) + 1;
        }
      }
    }
    return freqs;
  };

  const clusterBigrams = getBigrams(texts);
  const totalBigrams = getBigrams(allTexts);

  const scoredBigrams = Object.keys(clusterBigrams).map((bigram) => {
    const inCluster = clusterBigrams[bigram];
    const total = totalBigrams[bigram] || inCluster;
    const distinctScore = inCluster / (total + 1.0);
    return { bigram, score: distinctScore * Math.log(inCluster + 1) };
  });

  const bestBigrams = scoredBigrams.sort((a, b) => b.score - a.score);

  if (bestBigrams.length > 0 && bestBigrams[0].score > 0.05) {
    const term = bestBigrams[0].bigram;
    if (TOPIC_NORMALIZATIONS[term]) {
      return TOPIC_NORMALIZATIONS[term];
    }
    // Check if parts exist in normalizations
    const parts = term.split(" ");
    if (TOPIC_NORMALIZATIONS[parts[0]] && parts[1] === "project" || parts[1] === "projects") {
      return `${TOPIC_NORMALIZATIONS[parts[0]]} Projects`;
    }
    return cleanTitleCase(term);
  }

  // 2. Fallback: Distinctive single word
  const getUnigrams = (docs: string[]) => {
    const freqs: Record<string, number> = {};
    for (const doc of docs) {
      const words = doc
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w));
      for (const w of words) {
        freqs[w] = (freqs[w] || 0) + 1;
      }
    }
    return freqs;
  };

  const clusterUni = getUnigrams(texts);
  const totalUni = getUnigrams(allTexts);

  const scoredUni = Object.keys(clusterUni).map((w) => {
    const inCluster = clusterUni[w];
    const total = totalUni[w] || inCluster;
    const score = inCluster / (total + 1.0);
    return { w, score: score * Math.log(inCluster + 1) };
  });

  const bestUni = scoredUni.sort((a, b) => b.score - a.score);
  if (bestUni.length > 0) {
    const term = bestUni[0].w;
    if (TOPIC_NORMALIZATIONS[term]) {
      return TOPIC_NORMALIZATIONS[term];
    }
    return cleanTitleCase(term);
  }

  return "General Discussion";
}

// ---------------------------------------------------------------------------
// Groq Validation & Topic Naming
// ---------------------------------------------------------------------------
interface GroqResponse {
  valid: boolean;
  topic?: string;
  confidence?: number;
  reason?: string;
}

async function validateAndLabelClusterWithGroq(
  apiKey: string,
  clusterSize: number,
  samples: string[],
  isContent: boolean
): Promise<GroqResponse> {
  const systemPrompt = isContent
    ? `You are a professional content intelligence labeling engine.
Your task is to analyze a cluster of video titles and descriptions from a YouTube channel and return a JSON object representing the overall theme.

RULES:
1. You MUST categorize this cluster. You cannot reject it or return valid: false.
2. Determine a professional, high-quality, and concise topic name that describes what this content is about.
3. Prefer standard, professional industry labels (e.g., "Smartphones", "Consumer Electronics", "Electric Vehicles", "Accessibility Technology", "Audio Devices", "Wearables", "AI Hardware", "Robotics", "Computer Hardware", "Battery Technology") or similar professional domain equivalents. Avoid title fragments (e.g. DO NOT use "iPhone Air", "Donation Goes", "Wheelchair Factory").
4. Return ONLY a raw JSON object in the exact format:
{
  "valid": true,
  "topic": "Topic Label",
  "confidence": 95
}`
    : `You are a professional audience intelligence labeling engine.
Your task is to analyze a cluster of audience comments from a YouTube channel and return a JSON object.

DETERMINE:
1. Whether the cluster represents a meaningful, cohesive, and professional theme or interest (versus generic praise, milestones, spam, single-word comments, or random noise).
2. If NOT meaningful or just noise/spam/milestones/creator praise, return {"valid": false, "reason": "why it is invalid"}.
3. If valid, return {"valid": true, "topic": "Concise Professional Label", "confidence": 0-100}.

TOPIC LABEL RULES:
- Must represent an actual recurring theme or category (e.g. "Smartphone Cameras", "Electric Vehicles", "Battery Technology", "Robotics Projects", "Repairability").
- Must NOT be a simple concatenation of words, repeated phrases, or direct copy-paste of a comment (e.g. Reject "Close Million", "Iphone Air", "Water Always", "New Way").
- Keep labels concise, professional, and clear.

Return ONLY a raw JSON object in the exact format:
{
  "valid": true,
  "topic": "Topic Label",
  "confidence": 95
}
or
{
  "valid": false,
  "reason": "generic creator praise"
}`;

  const userContent = `Cluster Type: ${isContent ? "Video Content Titles/Descriptions" : "Audience Discussion Comments"}
Cluster Size: ${clusterSize} items
Representative Samples:
${samples.map((s, idx) => `${idx + 1}. "${s}"`).join("\n")}

Respond with the JSON object.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq API");
    }

    return JSON.parse(content) as GroqResponse;
  } catch (err) {
    console.error("[Groq Call Failed]", err);
    return { valid: false, reason: "API call failed or timed out" };
  }
}

// ---------------------------------------------------------------------------
// Main NLP Entry Point
// ---------------------------------------------------------------------------
export async function runNlpAnalysis(
  result: AnalysisResult,
  onProgress?: (msg: string) => void,
  customGroqKey?: string
): Promise<AnalysisResult> {
  try {
    const finalApiKey = customGroqKey || (typeof process !== "undefined" && (process as any).env?.GROQ_API_KEY) || (import.meta as any).env?.VITE_GROQ_API_KEY || (import.meta as any).env?.GROQ_API_KEY;

    // Clean all HTML tags and decode entities before any NLP processing
    const cleanedComments = result.topComments.map((c) => ({
      ...c,
      text: cleanHtmlAndTags(c.text),
    }));
    const cleanedVideos = result.topVideos.map((v) => ({
      ...v,
      title: cleanHtmlAndTags(v.title),
      description: cleanDescriptionAggressively(cleanHtmlAndTags(v.description)),
    }));

    console.log("[DEBUG] runNlpAnalysis: Cleaned videos count:", cleanedVideos.length);
    console.log("[DEBUG] runNlpAnalysis: Cleaned comments count:", cleanedComments.length);

    onProgress?.("Loading NLP model…");
    const pipe = await getPipe(onProgress);

    // ==========================================
    // PIPELINE 1: CONTENT TOPICS (Videos)
    // ==========================================
    onProgress?.("Processing video content…");
    const contentItems: { text: string; video: VideoItem; isDescription: boolean }[] = [];
    
    for (const v of cleanedVideos) {
      const title = v.title;
      const desc = v.description;

      // Embed description (weighted significantly higher by extracting key sentences
      // and pushing them multiple times to the list)
      if (desc && desc.trim().length > 10) {
        const sentences = desc
          .split(/[.!?]\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 15)
          .slice(0, 3); // Take first 3 key sentences

        for (const s of sentences) {
          // Push 3 times to weight it more heavily than title
          contentItems.push({ text: s, video: v, isDescription: true });
          contentItems.push({ text: s, video: v, isDescription: true });
          contentItems.push({ text: s, video: v, isDescription: true });
        }
      }
      
      // Push title once (lower weight)
      if (title && title.trim().length > 5) {
        contentItems.push({ text: title, video: v, isDescription: false });
      }
    }

    let contentTopics: DiscoveredTopic[] = [];

    if (contentItems.length > 0) {
      console.log("[DEBUG] content documents count:", contentItems.length);
      const contentTexts = contentItems.map((item) => item.text.slice(0, 1000));
      onProgress?.(`Generating content embeddings (${contentItems.length} items)…`);
      const contentEmbs = await embed(pipe, contentTexts);
      console.log("[DEBUG] content embeddings count:", contentEmbs.length);

       // Dynamic K estimation
      const kContent = Math.max(3, Math.min(6, Math.round(result.topVideos.length / 8)));
      console.log("[DEBUG] content clusters count:", kContent);
      const contentAssignments = runKMeans(contentEmbs, kContent);

      // Group
      const groupedContent: Record<number, typeof contentItems> = {};
      const groupedContentEmbs: Record<number, number[][]> = {};
      for (let i = 0; i < contentItems.length; i++) {
        const ass = contentAssignments[i];
        if (!groupedContent[ass]) {
          groupedContent[ass] = [];
          groupedContentEmbs[ass] = [];
        }
        groupedContent[ass].push(contentItems[i]);
        groupedContentEmbs[ass].push(contentEmbs[i]);
      }

      // Build content topics
      for (const key of Object.keys(groupedContent)) {
        const idx = parseInt(key, 10);
        const items = groupedContent[idx];
        const embs = groupedContentEmbs[idx];

        console.log("[DEBUG] content cluster size:", items.length);

        // Gather unique videos contributing to this cluster
        const videosMap = new Map<string, VideoItem>();
        for (const it of items) {
          videosMap.set(it.video.videoId, it.video);
        }
        const supportingVideos = Array.from(videosMap.values());

        // HIDE cluster if fewer than 2 supporting content items
        if (supportingVideos.length < 2) {
          console.log("[DEBUG] cluster pruned because supportingVideos < 2");
          continue;
        }

        const fallbackLabel = generateTopicLabel(
          items.map((it) => it.text),
          contentItems.map((it) => it.text)
        );

        console.log("[DEBUG] Content topic before Groq:", fallbackLabel);

        let label = fallbackLabel;
        if (finalApiKey && finalApiKey !== "YOUR_GROQ_API_KEY_HERE" && finalApiKey.trim() !== "") {
          onProgress?.("Validating content topic…");
          console.log("[DEBUG] sending content cluster to Groq");
          try {
            const groqRes = await validateAndLabelClusterWithGroq(
              finalApiKey,
              supportingVideos.length,
              items.map((it) => it.text).slice(0, 5),
              true
            );
            if (groqRes && groqRes.valid && groqRes.topic) {
              label = groqRes.topic;
              console.log("[DEBUG] Content topic after Groq renaming:", label);
            } else {
              console.log("[DEBUG] Groq rejected cluster or returned invalid data, falling back to local label");
              console.log("[DEBUG] Content topic after Groq renaming:", label);
            }
          } catch (err) {
            console.error("Groq call failed, falling back to local label:", err);
            console.log("[DEBUG] Content topic after Groq renaming:", label);
          }
        } else {
          console.log("[DEBUG] Content topic after Groq renaming:", label);
        }

        contentTopics.push({
          name: label,
          commentCount: 0,
          comments: [],
          videos: supportingVideos,
        });
      }
      console.log("[DEBUG] Final content topics returned to UI:", contentTopics.map(t => t.name));
      console.log("[DEBUG] final content topics count:", contentTopics.length);
    }

    // ==========================================
    // PIPELINE 2: AUDIENCE TOPICS (Comments)
    // ==========================================
    onProgress?.("Filtering audience comments…");
    const filteredComments = cleanedComments.filter((c) => !isNoiseComment(c.text));
    console.log("[DEBUG] runNlpAnalysis: Filtered audience comments count (after noise removal):", filteredComments.length);

    let audienceTopics: DiscoveredTopic[] = [];

    if (filteredComments.length > 0) {
      // Cap at 150 comments for browser performance
      const activeComments = filteredComments.slice(0, 150);
      const commentTexts = activeComments.map((c) => c.text.slice(0, 1000));

      onProgress?.(`Generating comment embeddings (${activeComments.length} items)…`);
      const commentEmbs = await embed(pipe, commentTexts);

      // Dynamic K estimation
      const kAudience = Math.max(3, Math.min(8, Math.round(activeComments.length / 12)));
      console.log("[DEBUG] runNlpAnalysis: kAudience (audience clusters created):", kAudience);
      const commentAssignments = runKMeans(commentEmbs, kAudience);

      // Group
      const groupedComments: Record<number, typeof activeComments> = {};
      const groupedCommentEmbs: Record<number, number[][]> = {};
      for (let i = 0; i < activeComments.length; i++) {
        const ass = commentAssignments[i];
        if (!groupedComments[ass]) {
          groupedComments[ass] = [];
          groupedCommentEmbs[ass] = [];
        }
        groupedComments[ass].push(activeComments[i]);
        groupedCommentEmbs[ass].push(commentEmbs[i]);
      }

      // Build audience topics
      for (const key of Object.keys(groupedComments)) {
        const idx = parseInt(key, 10);
        const items = groupedComments[idx];
        const embs = groupedCommentEmbs[idx];

        // HIDE cluster if fewer than 3 supporting comments
        if (items.length < 3) continue;

        // Topics must represent recurring audience interests across multiple videos
        const uniqueVideos = new Set(items.map((it) => it.videoId).filter(Boolean));
        if (cleanedVideos.length > 1 && uniqueVideos.size < 2) continue;

        const centroid = meanPool(embs);

        // Sort comments by similarity to centroid (closest comments represent the cluster)
        const scoredComments = items.map((comment, i) => ({
          comment,
          score: cosineSim(embs[i], centroid),
        })).sort((a, b) => b.score - a.score);

        const repComments = scoredComments.map((sc) => sc.comment);

        // Label & Validate with Groq
        let label = "";
        if (finalApiKey && finalApiKey !== "YOUR_GROQ_API_KEY_HERE" && finalApiKey.trim() !== "") {
          onProgress?.("Validating audience topic…");
          console.log("[DEBUG] runNlpAnalysis: Sending audience cluster to Groq. Comments count:", items.length);
          const groqRes = await validateAndLabelClusterWithGroq(
            finalApiKey,
            items.length,
            repComments.slice(0, 5).map((c) => c.text),
            false
          );
          if (groqRes.valid && groqRes.topic) {
            label = groqRes.topic;
            console.log("[DEBUG] Groq accepted audience topic:", groqRes.topic, "with confidence", groqRes.confidence);
          } else {
            console.log("[DEBUG] Groq rejected audience topic. Reason:", groqRes.reason);
            continue; // Skip invalid cluster
          }
        } else {
          label = generateTopicLabel(
            items.map((it) => it.text),
            activeComments.map((it) => it.text)
          );
        }

        // Map to related videos (implicitly find top videos that fit best,
        // or reference matching videos from the channel)
        const relatedVideos: VideoItem[] = [];
        if (result.topVideos.length > 0) {
          relatedVideos.push(result.topVideos[0]);
          if (result.topVideos[1]) relatedVideos.push(result.topVideos[1]);
        }

        audienceTopics.push({
          name: label,
          commentCount: items.length,
          comments: repComments.slice(0, 5), // Keep top 5 representative comments
          videos: relatedVideos,
        });
      }
    }

    // Sort by volume/importance
    contentTopics.sort((a, b) => b.videos.length - a.videos.length);
    audienceTopics.sort((a, b) => b.commentCount - a.commentCount);

    return {
      ...result,
      topComments: cleanedComments,
      topVideos: cleanedVideos,
      nlp: {
        keyTerms: [],
        topSentences: [],
        trends: [],
        modelUsed: MODEL_ID,
        contentTopics,
        audienceTopics,
        commentsProcessed: filteredComments.length,
      },
    };
  } catch (err) {
    console.error("[NLP] Refinement failed:", err);
    return result;
  }
}
