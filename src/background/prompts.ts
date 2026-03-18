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
  pageContent: ScrapedContent,
  projectInfo: ProjectInfo
): string {
  const pageLang = detectLanguage(pageContent);
  const langName = LANGUAGE_NAMES[pageLang] || '英文';
  
  switch (mode) {
    case 'comment':
      return buildCommentPrompt(pageContent, projectInfo, pageLang, langName);
    case 'directory':
      return buildDirectoryPrompt(projectInfo, pageLang, langName);
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
- 你关注 ${projectInfo.keywords || '相关'} 领域
- 你的网站：${projectInfo.targetUrl}

## 任务
请生成两个版本的评论，用 JSON 格式返回：

{
  "original": "用${langName}写的评论（匹配文章语言）",
  "chinese": "中文版本的评论"
}

## 评论要求
1. 字数：50-100字
2. 语气自然真诚，像真正阅读过文章的读者
3. 可以赞同观点、分享经验或提出问题
4. 适当提及你的网站（${projectInfo.targetUrl}）
5. 不要像广告或垃圾评论
6. original 必须用${langName}写，要符合该语言的表达习惯
${isChinese ? '7. 如果文章是中文，original 和 chinese 内容相同即可' : ''}

请只返回 JSON，不要有其他内容。`;
}

/**
 * 导航站描述 Prompt
 */
function buildDirectoryPrompt(
  projectInfo: ProjectInfo,
  pageLang: string,
  langName: string
): string {
  const isChinese = pageLang === 'zh';

  return `你是 SEO 文案专家，需要为网站撰写导航站提交描述。

## 网站信息
- 名称：${projectInfo.brandName || '待填写'}
- 网址：${projectInfo.targetUrl}
- 关键词：${projectInfo.keywords}
- 目标导航站语言：${langName}

## 任务
请生成两个版本的网站描述，用 JSON 格式返回：

{
  "original": "用${langName}写的网站描述（匹配导航站语言）",
  "chinese": "中文版本的网站描述"
}

## 描述要求
1. 字数：200-300字
2. 专业正式，有说服力
3. 包含核心业务、优势、目标用户
4. SEO 友好，自然融入关键词
5. 不要夸大宣传
6. original 必须用${langName}写，符合该语言的表达习惯
${isChinese ? '7. 如果是中文导航站，original 和 chinese 内容相同即可' : ''}

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
