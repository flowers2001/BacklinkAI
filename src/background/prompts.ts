// ========================================
// AI Prompt 模板
// ========================================

import type { ScrapedContent, ProjectInfo, WorkMode } from '../shared/types';

/**
 * 检测页面语言
 */
function detectLanguage(pageContent: ScrapedContent): string {
  const text = (pageContent.title + ' ' + pageContent.bodyText.slice(0, 500)).toLowerCase();
  
  // 中文
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  // 日文
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  // 韩文
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  // 俄文
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';
  // 德文特征词
  if (/\b(und|der|die|das|ist|für|mit)\b/.test(text)) return 'de';
  // 法文特征词
  if (/\b(le|la|les|est|pour|avec|dans)\b/.test(text)) return 'fr';
  // 西班牙文特征词
  if (/\b(el|la|los|las|es|para|con)\b/.test(text)) return 'es';
  // 默认英文
  return 'en';
}

/**
 * 语言名称映射
 */
const LANGUAGE_NAMES: Record<string, string> = {
  'zh': '中文',
  'en': '英文',
  'ja': '日文',
  'ko': '韩文',
  'de': '德文',
  'fr': '法文',
  'es': '西班牙文',
  'ru': '俄文',
};

/**
 * 构建 AI Prompt
 */
export function buildPrompt(
  mode: WorkMode,
  pageContent: ScrapedContent | null,
  projectInfo: ProjectInfo,
  charLimit?: number
): string {
  // 评论模式需要页面内容来检测语言，导航站模式默认英文（国际站）
  const pageLang = pageContent ? detectLanguage(pageContent) : 'en';
  const langName = LANGUAGE_NAMES[pageLang] || '英文';
  
  switch (mode) {
    case 'comment':
      if (!pageContent) throw new Error('评论模式需要页面内容');
      return buildCommentPrompt(pageContent, projectInfo, pageLang, langName);
    case 'directory':
      return buildDirectoryPrompt(projectInfo, charLimit);
    default:
      throw new Error(`未知模式: ${mode}`);
  }
}

/**
 * 博客评论 Prompt
 */
function buildCommentPrompt(
  pageContent: ScrapedContent,
  projectInfo: ProjectInfo,
  pageLang: string,
  langName: string
): string {
  const title = pageContent.title || '无标题';
  const mainHeading = pageContent.h1[0] || pageContent.h2[0] || '';
  const bodyPreview = pageContent.bodyText.slice(0, 500);
  const isChinese = pageLang === 'zh';

  return `你是一个热情的博客读者，需要为一篇${langName}文章写评论。

## 文章信息
- 标题：${title}
${mainHeading ? `- 主标题：${mainHeading}` : ''}
- 内容预览：${bodyPreview}...
- 文章语言：${langName}

## 你的背景
- 你是 ${projectInfo.brandName || '一个网站'} 的用户/运营者
- 你的网站：${projectInfo.targetUrl}
- 网站介绍：${projectInfo.description || projectInfo.keywords || '无'}

## 任务
请生成两个版本的评论，用 JSON 格式返回：

{
  "original": "用${langName}写的评论（匹配文章语言）",
  "chinese": "中文版本的评论"
}

## 评论要求
1. 字数：50-100字
2. 语气自然真诚，像真正阅读过文章的读者
3. 结合文章内容和你的网站背景，分享相关经验或见解
4. **必须在评论中自然地附带网站链接 ${projectInfo.targetUrl}**
5. 链接要融入上下文，比如"我在 ${projectInfo.targetUrl} 也做过类似的..."
6. 不要像广告或垃圾评论，链接出现要有理由
7. original 必须用${langName}写，要符合该语言的表达习惯
${isChinese ? '8. 如果文章是中文，original 和 chinese 内容相同即可' : ''}

请只返回 JSON，不要有其他内容。`;
}

/**
 * 导航站描述 Prompt
 */
function buildDirectoryPrompt(
  projectInfo: ProjectInfo,
  charLimit?: number
): string {
  // 根据字符限制调整要求
  let charLimitRequirement: string;
  let strictWarning = '';
  
  if (charLimit) {
    // 留 15% 余量，避免超出
    const safeLimit = Math.floor(charLimit * 0.85);
    charLimitRequirement = `**字符限制：英文版本严格控制在 ${safeLimit} 个字符以内（包括空格、标点，表单最大允许 ${charLimit} 字符）**`;
    strictWarning = `
⚠️ 极其重要：
- 英文版本必须 ≤ ${safeLimit} 个字符（characters），不是单词数！
- 字符数 = 字母 + 空格 + 标点符号，全部计入
- 超出限制会导致表单提交失败！
- 生成后请自行数一下字符数确保不超`;
  } else {
    charLimitRequirement = '英文版本：100-200个字符；中文版本：50-150个字符';
  }

  return `你是 SEO 文案专家，需要为网站撰写导航站/目录站提交描述。

## 网站信息
- 品牌名称：${projectInfo.brandName || '待填写'}
- 网址：${projectInfo.targetUrl}
- 核心关键词：${projectInfo.keywords || '待填写'}
- 网站介绍：${projectInfo.description || '无'}

## 任务
基于上述网站信息，生成适合提交到导航站的描述。用 JSON 格式返回：

{
  "original": "英文版本（简短精炼）",
  "chinese": "中文版本"
}

## 描述要求
1. ${charLimitRequirement}
2. 基于网站介绍，用专业的语言重新表述
3. 突出核心功能、优势和目标用户
4. 自然融入关键词「${projectInfo.keywords}」
5. 不要照抄网站介绍，要改写优化
${strictWarning}

请只返回 JSON，不要有其他内容。`;
}

/**
 * 系统提示
 */
export function getSystemPrompt(): string {
  return `你是专业的多语言内容创作助手。你能够：
1. 准确识别目标语言并用该语言写作
2. 写出符合当地语言习惯的自然内容
3. 同时提供中文版本便于用户理解

请严格按要求返回 JSON 格式，不要添加任何解释或 markdown 标记。`;
}
