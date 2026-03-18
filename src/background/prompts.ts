// ========================================
// AI Prompt 模板
// ========================================

import type { ScrapedContent, ProjectInfo, WorkMode } from '../shared/types';

/**
 * 构建 AI Prompt
 */
export function buildPrompt(
  mode: WorkMode,
  pageContent: ScrapedContent,
  projectInfo: ProjectInfo
): string {
  switch (mode) {
    case 'comment':
      return buildCommentPrompt(pageContent, projectInfo);
    case 'directory':
      return buildDirectoryPrompt(projectInfo);
    default:
      throw new Error(`未知模式: ${mode}`);
  }
}

/**
 * 构建博客评论 Prompt
 */
function buildCommentPrompt(
  pageContent: ScrapedContent,
  projectInfo: ProjectInfo
): string {
  // 提取关键信息
  const title = pageContent.title || '无标题';
  const description = pageContent.metaDescription || '';
  const mainHeading = pageContent.h1[0] || pageContent.h2[0] || '';
  const bodyPreview = pageContent.bodyText.slice(0, 500);
  
  // 检测语言（简单判断）
  const isChinesePage = /[\u4e00-\u9fa5]/.test(pageContent.title + pageContent.bodyText.slice(0, 200));
  const languageHint = isChinesePage ? '请用中文回复。' : 'Please respond in English.';
  
  return `你是一个热情的博客读者，刚刚阅读完一篇文章，想要留下一条有价值的评论。

## 文章信息
- 标题：${title}
${mainHeading ? `- 主标题：${mainHeading}` : ''}
${description ? `- 摘要：${description}` : ''}
- 内容预览：${bodyPreview}...

## 你的背景
- 你关注${projectInfo.keywords}相关领域
- 你运营一个网站：${projectInfo.targetUrl}

## 任务
请写一条博客评论，要求：
1. 字数：50-100字
2. 语气自然真诚，像一个真正阅读过文章的读者
3. 可以选择以下任意一种风格：
   - 赞同作者观点并补充自己的见解
   - 分享相关的个人经验
   - 提出一个有深度的问题
4. 在适当的位置自然地提及你的网站（${projectInfo.targetUrl}）和你关注的领域（${projectInfo.keywords}）
5. 不要显得像广告或垃圾评论
6. 不要使用"很棒"、"好文章"等空洞的表述

${languageHint}

请直接输出评论内容，不要有任何前缀或解释。`;
}

/**
 * 构建导航站描述 Prompt
 */
function buildDirectoryPrompt(projectInfo: ProjectInfo): string {
  return `你是一名专业的 SEO 文案撰写专家，需要为一个网站撰写提交到导航站的描述。

## 网站信息
- 网站名称：${projectInfo.brandName || '待填写'}
- 网站地址：${projectInfo.targetUrl}
- 核心业务/关键词：${projectInfo.keywords}

## 任务
请撰写一段专业的网站描述，用于提交到各类导航站/网站目录。

## 要求
1. 字数：200-300字
2. 风格专业正式，具有说服力
3. 包含以下要素：
   - 网站名称和核心定位
   - 主要产品/服务/内容
   - 独特优势或差异化卖点
   - 目标用户群体
   - 品牌价值主张
4. SEO 友好：自然融入关键词（${projectInfo.keywords}）
5. 不要使用夸大或虚假宣传的措辞
6. 不要使用第一人称（我们、我）
7. 段落清晰，便于阅读

请直接输出网站描述，不要有任何前缀或解释。`;
}

/**
 * 构建系统提示（System Prompt）
 */
export function getSystemPrompt(): string {
  return `你是一个专业的内容创作助手，专注于帮助用户创作高质量的 SEO 相关内容。

核心原则：
1. 内容真实自然，不像 AI 生成
2. 符合人类的写作习惯和语气
3. 避免过度使用形容词和夸张表达
4. 关注读者价值，不纯粹为 SEO 而写
5. 遵守平台规则，不生成垃圾内容

输出规范：
- 直接输出最终内容
- 不要添加标题、前缀或解释
- 不要使用 Markdown 格式（除非明确要求）
- 保持指定的字数范围`;
}
