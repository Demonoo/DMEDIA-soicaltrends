
export interface TrendItem {
  rank: number;
  title: string;
  hotValue: number;
  category: string;
  heatRise?: number; // Estimated increase in hot value over last 10 minutes
  description?: string;
}

// Shared structure for both Single Trend and Global Market Analysis
export interface GeneMapAnalysis {
  viralityScore: number;
  sentiment: {
    label: string; // e.g. "振奋"
    analysis: string; // Detailed text
  };
  domain: {
    label: string; // e.g. "体育赛事"
    analysis: string;
  };
  contentForm: {
    label: string; // e.g. "赛事集锦"
    analysis: string;
  };
  lifecycle: {
    label: string; // e.g. "短期24h"
    analysis: string;
  };
  keywords: string[];
}

export type TrendAnalysis = GeneMapAnalysis;
export type GlobalAnalysis = GeneMapAnalysis;

export interface BigEvent {
  title: string;
  reason: string;
  durationLabel: string;
}

export interface AIResponse<T> {
  data: T;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  ANALYSIS = 'ANALYSIS',
  SETTINGS = 'SETTINGS'
}

export const CATEGORIES = ['社会民生', '娱乐精选', '科技数码', '时尚生活', '情感日常', '兴趣垂类'];
