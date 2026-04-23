// LLM 音频分析模块 - 带缓存和更丰富的分析

// 歌词哈希计算
function hashLyrics(lyrics) {
  const text = lyrics.map(l => `${l.time}:${l.text}`).join('|');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// 缓存管理器
class AnalysisCache {
  constructor() {
    this.cacheKey = 'lyrics_analysis_cache';
  }

  get(lyricsHash) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
      const entry = cache[lyricsHash];
      if (entry && Date.now() - entry.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7天过期
        return entry.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  set(lyricsHash, data) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
      cache[lyricsHash] = {
        data,
        timestamp: Date.now()
      };
      // 限制缓存数量
      const keys = Object.keys(cache);
      if (keys.length > 50) {
        delete cache[keys[0]];
      }
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (e) {
      console.warn('缓存写入失败:', e);
    }
  }
}

const DEFAULT_PROMPT = `你是一个专业的音乐可视化设计师。请深度分析这首歌的歌词，生成详细的视觉参数。

请给出以下JSON格式的建议：

{
  "style": "音乐风格: energetic(热情)|calm(平静)|romantic(浪漫)|electronic(电子)|rock(摇滚)|melancholic(忧郁)|dreamy(梦幻)|dramatic(戏剧)",
  "description": "一句话描述音乐氛围",
  "suggestedColors": ["#主色调(十六进制)", "#辅色调", "#强调色"],
  "mood": "情绪标签",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  
  // 视觉效果参数
  "auroraSpeed": 0.1-1.0 (流动速度),
  "lightIntensity": 0.1-0.5 (光线亮度),
  "particleIntensity": 0.3-2.0 (效果强度),
  
  // 背景风格
  "backgroundStyle": "aurora(极光)|stars(星空)|rain(雨滴)|neon(霓虹)|minimal(简约)",
  
  // 歌词特效
  "lyricsStyle": "gradient(渐变)|glow(发光)|particle(粒子)|minimal(简约)",
  
  // 高潮时间点（根据歌词情感高潮标记，单位秒）
  "climaxPoints": [
    {"time": 45, "description": "副歌第一次爆发"},
    {"time": 120, "description": "情感高潮"}
  ],
  
  // 高潮特效参数
  "climaxColors": ["#高潮主色", "#高潮辅色"],
  "climaxIntensity": 1.5-3.0
}

重要要求：
1. suggestedColors 必须是 #开头的十六进制颜色，如 "#667eea"
2. climaxPoints 根据歌词情感变化标记，不超过5个
3. 回复必须是完整JSON，不要有其他文字`;

// 备用预设
const FALLBACK_PRESETS = {
  energetic: {
    style: 'energetic',
    description: '充满活力的音乐',
    suggestedColors: ['#ff6b6b', '#feca57', '#ff9f43'],
    climaxColors: ['#ffd700', '#ff4500'],
    mood: '欢快',
    keywords: ['活力', '节奏感', '动感'],
    auroraSpeed: 0.9,
    lightIntensity: 0.35,
    particleIntensity: 1.8,
    backgroundStyle: 'neon',
    lyricsStyle: 'glow'
  },
  calm: {
    style: 'calm',
    description: '平静舒缓的音乐',
    suggestedColors: ['#74b9ff', '#a29bfe', '#81ecec'],
    climaxColors: ['#dfe6e9', '#b2bec3'],
    mood: '平静',
    keywords: ['宁静', '平和', '放松'],
    auroraSpeed: 0.12,
    lightIntensity: 0.1,
    particleIntensity: 0.4,
    backgroundStyle: 'aurora',
    lyricsStyle: 'minimal'
  },
  romantic: {
    style: 'romantic',
    description: '浪漫温柔的音乐',
    suggestedColors: ['#ff9ff3', '#f8a5c2', '#ff6b81'],
    climaxColors: ['#fff415', '#ff6b9d'],
    mood: '浪漫',
    keywords: ['浪漫', '温柔', '甜蜜'],
    auroraSpeed: 0.2,
    lightIntensity: 0.18,
    particleIntensity: 0.7,
    backgroundStyle: 'stars',
    lyricsStyle: 'gradient'
  },
  electronic: {
    style: 'electronic',
    description: '电子音乐',
    suggestedColors: ['#667eea', '#764ba2', '#f093fb'],
    climaxColors: ['#00d4ff', '#ff00ff'],
    mood: '科技感',
    keywords: ['电子', '科技', '未来'],
    auroraSpeed: 0.8,
    lightIntensity: 0.4,
    particleIntensity: 1.8,
    backgroundStyle: 'neon',
    lyricsStyle: 'particle'
  },
  melancholic: {
    style: 'melancholic',
    description: '忧郁伤感的音乐',
    suggestedColors: ['#5f27cd', '#341f97', '#48dbfb'],
    climaxColors: ['#a29bfe', '#6c5ce7'],
    mood: '忧郁',
    keywords: ['忧郁', '伤感', '深沉'],
    auroraSpeed: 0.1,
    lightIntensity: 0.06,
    particleIntensity: 0.3,
    backgroundStyle: 'rain',
    lyricsStyle: 'glow'
  },
  dreamy: {
    style: 'dreamy',
    description: '梦幻空灵的音乐',
    suggestedColors: ['#a29bfe', '#74b9ff', '#fd79a8'],
    climaxColors: ['#ffeaa7', '#fab1a0'],
    mood: '梦幻',
    keywords: ['梦幻', '空灵', '飘渺'],
    auroraSpeed: 0.15,
    lightIntensity: 0.12,
    particleIntensity: 0.6,
    backgroundStyle: 'stars',
    lyricsStyle: 'gradient'
  },
  dramatic: {
    style: 'dramatic',
    description: '戏剧性的音乐',
    suggestedColors: ['#e17055', '#d63031', '#ff7675'],
    climaxColors: ['#ffd700', '#ff4757'],
    mood: '戏剧',
    keywords: ['戏剧', '张力', '高潮'],
    auroraSpeed: 0.6,
    lightIntensity: 0.3,
    particleIntensity: 1.5,
    backgroundStyle: 'neon',
    lyricsStyle: 'glow'
  }
};

class LLMAnalyzer {
  constructor() {
    this.apiKey = localStorage.getItem('llm_api_key') || '';
    this.baseURL = localStorage.getItem('llm_base_url') || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = localStorage.getItem('llm_model') || 'qwen-turbo';
    this.cache = new AnalysisCache();
    
    // 用户手动设置的参数（优先级最高）
    this.manualSettings = {
      backgroundStyle: null,
      colors: null,
      intensity: null
    };
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('llm_api_key', key);
  }

  setBaseURL(url) {
    this.baseURL = url;
    localStorage.setItem('llm_base_url', url);
  }

  setModel(model) {
    this.model = model;
    localStorage.setItem('llm_model', model);
  }

  // 设置手动参数（会覆盖AI分析结果）
  setManualSetting(key, value) {
    this.manualSettings[key] = value;
  }

  inferStyleFromLyrics(lyricsText) {
    if (!lyricsText) return 'dreamy';
    
    const text = lyricsText.toLowerCase();
    
    if (/party|dance|嗨|躁动|狂欢|燃烧|释放|激情|燥|嗨起来|摇摆|动次打次/.test(text)) return 'energetic';
    if (/love|爱|心|吻|拥抱|甜蜜|想你|思念|牵手|forever|喜欢/.test(text)) return 'romantic';
    if (/sad|伤|痛|哭|泪|悲|离|别|失去|心碎|分手|遗憾|孤独|难过/.test(text)) return 'melancholic';
    if (/dream|梦|星|月|云|飘|飞|幻|星空|银河|天空|飞翔|宇宙/.test(text)) return 'dreamy';
    if (/电音|电子|beat|drop|rave|synth|techno|house|蹦/.test(text)) return 'electronic';
    if (/命运|生死|怒吼|嘶吼|呐喊|悲壮|史诗|战争|不让|绝不/.test(text)) return 'dramatic';
    
    return 'dreamy';
  }

  // 分析高潮时间点
  analyzeClimaxPoints(lyrics) {
    if (!lyrics || lyrics.length === 0) return [];
    
    const climaxIndicators = [
      '永远', 'forever', '永远爱', '永远在一起',
      '再见了', '再见', '离开', '远去',
      '不再', '绝不', '绝不会', '永远不会',
      '让我', '给我', '给我一次', '再给我',
      '爱', 'love', '爱着', '爱过', '深爱',
      '痛', '苦', '伤', '心碎',
      '燃烧', '释放', '爆发', 'high'
    ];
    
    const points = [];
    const lines = lyrics.split('\n').filter(l => l.trim());
    const avgDuration = 180 / Math.max(lines.length, 1);
    
    lines.forEach((line, i) => {
      const lineLower = line.toLowerCase();
      for (const indicator of climaxIndicators) {
        if (lineLower.includes(indicator.toLowerCase())) {
          const time = Math.floor((i + 1) * avgDuration);
          if (!points.find(p => Math.abs(p.time - time) < 15)) {
            points.push({
              time,
              description: line.slice(0, 25)
            });
          }
          break;
        }
      }
    });
    
    return points.slice(0, 5);
  }

  // 根据歌词内容推断背景风格
  inferBackgroundStyle(lyricsText) {
    if (!lyricsText) return 'aurora';
    
    const text = lyricsText.toLowerCase();
    
    if (/雨|泪|哭泣|伤心|分手|悲/.test(text)) return 'rain';
    if (/梦|星|宇宙|天空|银河|夜/.test(text)) return 'stars';
    if (/电|科技|未来|赛博|霓虹|夜店/.test(text)) return 'neon';
    if (/海|风|自然|天空|云/.test(text)) return 'aurora';
    
    return 'aurora';
  }

  async analyzeMusic(audioFile, lyricsArray) {
    // 获取歌词文本
    const lyricsText = lyricsArray.map(l => l.text). join('\n');
    
    // 生成歌词哈希
    const lyricsHash = hashLyrics(lyricsArray);
    
    // 检查缓存
    const cached = this.cache.get(lyricsHash);
    if (cached) {
      // 应用手动设置
      return this.applyManualSettings({ ...cached, fromCache: true });
    }
    
    // 基础分析
    const style = this.inferStyleFromLyrics(lyricsText);
    const baseResult = { ...FALLBACK_PRESETS[style] };
    
    // 分析高潮点
    baseResult.climaxPoints = this.analyzeClimaxPoints(lyricsText);
    
    // 根据歌词推断背景风格
    baseResult.backgroundStyle = this.inferBackgroundStyle(lyricsText);
    
    if (!this.apiKey) {
      baseResult.source = 'fallback';
      baseResult.note = '基于歌词关键词分析';
      return this.applyManualSettings(baseResult);
    }

    const prompt = lyricsText.trim() 
      ? `${DEFAULT_PROMPT}\n\n这首歌的歌词：\n${lyricsText.slice(0, 1500)}`
      : `${DEFAULT_PROMPT}\n\n请根据文件名 "${audioFile.name}" 判断风格。`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API 请求失败');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) throw new Error('未获取到分析结果');

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const finalResult = {
          ...baseResult,
          ...this.normalizeResult(result),
          source: 'llm'
        };
        
        // 缓存结果
        this.cache.set(lyricsHash, finalResult);
        
        return this.applyManualSettings(finalResult);
      }

      throw new Error('无法解析分析结果');
    } catch (error) {
      console.warn('LLM分析失败:', error.message);
      baseResult.source = 'fallback';
      baseResult.note = '分析失败，使用默认风格';
      return this.applyManualSettings(baseResult);
    }
  }

  applyManualSettings(result) {
    // 手动设置覆盖AI分析
    if (this.manualSettings.backgroundStyle) {
      result.backgroundStyle = this.manualSettings.backgroundStyle;
    }
    if (this.manualSettings.colors) {
      result.suggestedColors = [...this.manualSettings.colors];
    }
    if (this.manualSettings.intensity !== null) {
      result.particleIntensity = this.manualSettings.intensity;
    }
    return result;
  }

  normalizeResult(result) {
    if (result.suggestedColors && Array.isArray(result.suggestedColors)) {
      result.suggestedColors = result.suggestedColors.map(c => {
        if (typeof c === 'string') {
          let color = c.trim().replace(/["']/g, '');
          if (!color.startsWith('#')) color = '#' + color;
          return color;
        }
        return '#667eea';
      });
    }
    
    if (result.climaxColors && Array.isArray(result.climaxColors)) {
      result.climaxColors = result.climaxColors.map(c => {
        if (typeof c === 'string') {
          let color = c.trim().replace(/["']/g, '');
          if (!color.startsWith('#')) color = '#' + color;
          return color;
        }
        return '#ffd700';
      });
    }

    result.auroraSpeed = Math.max(0.1, Math.min(1.0, result.auroraSpeed || 0.5));
    result.lightIntensity = Math.max(0.05, Math.min(0.5, result.lightIntensity || 0.2));
    result.particleIntensity = Math.max(0.3, Math.min(2.0, result.particleIntensity || 1));
    result.climaxIntensity = Math.max(1.0, Math.min(3.0, result.climaxIntensity || 1.5));

    return result;
  }
  
  // 清除缓存
  clearCache() {
    localStorage.removeItem('lyrics_analysis_cache');
  }
}

export default LLMAnalyzer;
