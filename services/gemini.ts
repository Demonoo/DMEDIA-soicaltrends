
import { TrendItem, TrendAnalysis, GlobalAnalysis, BigEvent, AIResponse } from "../types";

// Key Management
const API_KEY_STORAGE_KEY = 'deepseek_api_key';

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const setApiKey = (key: string) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

// DeepSeek API Client Helper
const callDeepSeek = async (systemPrompt: string, userPrompt: string): Promise<{ content: string, usage: any }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 1.0, 
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `DeepSeek API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
  };
};

// --- Schemas for Prompting ---

const TRENDS_PROMPT = `
You are a creative social media trend simulator. Generate a JSON object containing a list of 15 realistic, simulated Douyin (Chinese TikTok) hot search trends for today. 
The content MUST be in Chinese.
Mix of entertainment, news, tech, and memes.
Hot values should range from 1,000,000 to 20,000,000.

Output format must be JSON:
{
  "trends": [
    {
      "rank": number,
      "title": "string (Chinese)",
      "hotValue": number,
      "category": "娱乐" | "新闻" | "科技" | "生活" | "体育" | "游戏",
      "description": "string (Short description in Chinese)"
    }
  ]
}
`;

const GENE_MAP_SCHEMA = `
请从以下四个维度进行专业分析：
1. 情感倾向分析(sentiment)：判断主要情感基调（如振奋、骄傲、期待、中立、担忧等）
2. 创作领域归类(domain)：确定内容所属领域（如体育赛事、社会新闻、娱乐八卦、科技数码等）
3. 内容形态匹配(contentForm)：推荐适合短视频创作者的内容表现形式（如赛事集锦、新闻报道、短视频、深度访谈等）
4. 生命周期预测(lifecycle)：预估热点的持续时间（短期24h、中期48h、长期72h）及影响因素

返回格式必须严格遵守以下 JSON 结构:
{
  "viralityScore": number (0-100),
  "sentiment": {
    "label": "string (简短标签)",
    "analysis": "string (具体分析)"
  },
  "domain": {
    "label": "string (简短标签)",
    "analysis": "string (具体分析)"
  },
  "contentForm": {
    "label": "string (简短标签)",
    "analysis": "string (具体分析)"
  },
  "lifecycle": {
    "label": "string (简短标签)",
    "analysis": "string (具体分析)"
  },
  "keywords": ["string", "string", "string", "string", "string"] (3-5个最相关的关键词)
}
`;

const ANALYSIS_PROMPT = (title: string) => `
分析抖音热点话题: "${title}"。请进行专业的"热点基因图谱分析"。
请返回 JSON 格式。

${GENE_MAP_SCHEMA}
`;

const GLOBAL_MAP_PROMPT = (trendsList: string) => `
基于以下抖音实时热搜榜单（Top 50），进行全平台宏观维度的"热点基因图谱分析汇总"。
请把这50条热点视为一个整体市场表现，分析当前大盘的流量特征。
请返回 JSON 格式。

榜单数据:
${trendsList}

${GENE_MAP_SCHEMA}
注意：
- "sentiment" 应分析整个大盘的主流情绪。
- "domain" 应分析当前最热门的主流创作领域。
- "contentForm" 应推荐当前最容易获利的内容形式。
- "lifecycle" 应预测当前这一波热点的整体持续性。
- "viralityScore" 代表当前大盘的流量活跃度 (0-100)。
- "keywords" (核心热词): 请重点识别榜单中热度飙升最快的前10个话题，提取它们所属"核心创作领域"的关键词（5-8个，例如：悬疑剧、电竞、社会新闻、萌宠）。
`;

const BIG_EVENTS_PROMPT = (trendsList: string) => `
基于以下抖音实时热搜榜单（Top 50），请智能识别并筛选出"发酵时间超过72小时"的【大事件】。
这些事件通常是社会民生类、灾害事故类或持续性争议话题。

判断逻辑：
1. 话题中包含 "后续", "回应", "进展", "第六天", "第三天", "再发声" 等暗示时间延续的词。
2. 已知的大型社会新闻或持续性事件（如自然灾害后续、长期社会议题）。
3. 评论区或标题暗示这是旧闻新进展。

榜单数据:
${trendsList}

请返回 JSON 格式:
{
  "events": [
    {
      "title": "话题标题",
      "reason": "简述理由 (如: 包含'后续'字样，判断为火灾事故延伸)",
      "durationLabel": "预估已发酵时长 (如: 已发酵3天)"
    }
  ]
}
如果找不到明显长周期事件，返回空数组。
`;

// Helper to simulate a "10 min rise" based on total heat
const calculateHeatRise = (totalHotValue: number) => {
    const percentage = Math.random() * 0.07 + 0.01;
    return Math.floor(totalHotValue * percentage);
};

// --- Keyword Classification Logic ---

const KEYWORD_MAP: Record<string, string[]> = {
    "娱乐精选": ["剧", "电影", "明星", "演员", "综艺", "演唱会", "歌", "舞", "网红", "直播", "游戏", "电竞", "王者", "原神", "吃鸡", "笑", "梗", "瓜", "爆料", "前任", "现任"],
    "社会民生": ["新闻", "事件", "回应", "官方", "通报", "政策", "经济", "股市", "基金", "工资", "招聘", "工作", "职场", "教育", "学校", "考试", "历史", "文化", "农业", "农村"],
    "科技数码": ["AI", "人工智能", "手机", "苹果", "华为", "小米", "电脑", "汽车", "新能源", "驾驶", "航天", "科学", "技术", "发明", "未来"],
    "时尚生活": ["穿搭", "妆", "护肤", "口红", "包包", "奢侈品", "装修", "家居", "设计", "改造", "旅游", "景点", "打卡", "拍照", "摄影"],
    "情感日常": ["猫", "狗", "宠", "娃", "宝宝", "老公", "老婆", "男友", "女友", "恋爱", "分手", "结婚", "离婚", "Vlog", "日常", "记录", "感人", "泪目"],
    "兴趣垂类": ["吃", "美食", "菜", "饭", "烹饪", "健身", "减肥", "运动", "瑜伽", "跑步", "养生", "健康", "病", "医"]
};

const determineCategory = (title: string): string => {
    let maxScore = 0;
    let bestCategory = "社会民生"; // Default fallback

    for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
        let score = 0;
        for (const keyword of keywords) {
            if (title.includes(keyword)) {
                score += 1;
            }
        }
        if (score > maxScore) {
            maxScore = score;
            bestCategory = category;
        }
    }
    return bestCategory;
};

// --- Public API ---

export const fetchTrends = async (): Promise<TrendItem[]> => {
  // Try Primary API (App API)
  try {
    const timestamp = new Date().getTime();
    const targetUrl = 'https://aweme-hl.snssdk.com/aweme/v1/hot/search/list/?detail_list=1';
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&t=${timestamp}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Primary API network error');

    const data = await response.json();
    
    if (data && data.data && data.data.word_list) {
      return parseDouyinData(data.data.word_list);
    }
    throw new Error('Primary API invalid format');

  } catch (primaryError) {
    console.warn("Primary API failed, trying backup...", primaryError);

    // Try Backup API (Web API)
    try {
        const timestamp = new Date().getTime();
        const backupUrl = 'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/';
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(backupUrl)}&t=${timestamp}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Backup API network error');

        const data = await response.json();
        if (data && data.word_list) {
            return parseDouyinData(data.word_list);
        }
    } catch (backupError) {
        console.warn("Backup API failed, falling back to simulation.", backupError);
    }

    // If both fail, return simulation
    return fetchSimulatedTrends();
  }
};

const parseDouyinData = (list: any[]): TrendItem[] => {
    return list.map((item: any, index: number) => {
        const hotValue = item.hot_value || 0;
        const rank = item.position && item.position > 0 ? item.position : index + 1;
        const title = item.word;
        
        return {
          rank: rank,
          title: title,
          hotValue: hotValue,
          category: determineCategory(title), // Auto-classify based on title keywords
          heatRise: calculateHeatRise(hotValue),
          description: '' 
        };
      }).slice(0, 51);
};

// Fallback simulation using DeepSeek
const fetchSimulatedTrends = async (): Promise<TrendItem[]> => {
  try {
    const result = await callDeepSeek(
      "You are a helpful JSON generator. Output in Chinese.", 
      TRENDS_PROMPT
    );
    const parsed = JSON.parse(result.content);
    
    // Add calculated heatRise to simulated data
    return (parsed.trends || []).map((t: any) => ({
        ...t,
        heatRise: calculateHeatRise(t.hotValue)
    }));
  } catch (error) {
    if ((error as Error).message !== "MISSING_API_KEY") {
        console.error("DeepSeek API Error (Trends):", error);
    }
    return [
      { rank: 1, title: "获取数据失败 - 请检查网络", hotValue: 0, category: "社会民生", heatRise: 0, description: "无法连接到抖音 API 且 DeepSeek 未配置" },
      { rank: 2, title: "DeepSeek API 连接失败", hotValue: 12500000, category: "科技数码", heatRise: 890000, description: "请在设置中配置您的 DeepSeek API Key 以启用模拟数据。" },
    ];
  }
};

export const analyzeTrendWithAI = async (trendTitle: string): Promise<AIResponse<TrendAnalysis>> => {
  try {
    const result = await callDeepSeek(
      "You are a strategic social media analyst. Output strictly JSON in Chinese.",
      ANALYSIS_PROMPT(trendTitle)
    );
    return {
        data: JSON.parse(result.content) as TrendAnalysis,
        usage: result.usage
    };
  } catch (error: any) {
    if (error.message === "MISSING_API_KEY") {
        throw error;
    }
    console.error("DeepSeek API Error (Analysis):", error);
    return {
        data: {
            viralityScore: 0,
            sentiment: { label: "未知", analysis: "分析服务暂不可用" },
            domain: { label: "未知", analysis: "分析服务暂不可用" },
            contentForm: { label: "未知", analysis: "分析服务暂不可用" },
            lifecycle: { label: "未知", analysis: "分析服务暂不可用" },
            keywords: ["错误", "配置", "API"]
        }
    };
  }
};

export const analyzeGlobalTrends = async (trends: TrendItem[]): Promise<AIResponse<GlobalAnalysis>> => {
    // Send top 50 trends for better macro analysis
    const topTrends = trends.slice(0, 50).map(t => `${t.rank}. ${t.title} (${t.hotValue})`).join('\n');
    
    try {
        const result = await callDeepSeek(
            "You are a quantitative marketing analyst.",
            GLOBAL_MAP_PROMPT(topTrends)
        );
        return {
            data: JSON.parse(result.content) as GlobalAnalysis,
            usage: result.usage
        };
    } catch (error: any) {
        if (error.message === "MISSING_API_KEY") throw error;
        throw new Error("Analysis failed");
    }
};

export const identifyBigEvents = async (trends: TrendItem[]): Promise<AIResponse<{ events: BigEvent[] }>> => {
    const topTrends = trends.slice(0, 50).map(t => `${t.rank}. ${t.title}`).join('\n');
    
    try {
        const result = await callDeepSeek(
            "You are a social media analyst specializing in event tracking. Output JSON in Chinese.",
            BIG_EVENTS_PROMPT(topTrends)
        );
        return {
            data: JSON.parse(result.content) as { events: BigEvent[] },
            usage: result.usage
        };
    } catch (error: any) {
        if (error.message === "MISSING_API_KEY") throw error;
        // Return empty structure on failure
        return { data: { events: [] } };
    }
};
