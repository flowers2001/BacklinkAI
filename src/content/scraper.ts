// ========================================
// 页面内容抓取模块
// ========================================

import type { ScrapedContent } from '../shared/types';

/** 需要排除的标签 */
const EXCLUDED_TAGS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  'nav', 'header', 'footer', 'aside', 'menu',
  'form', 'button', 'input', 'select', 'textarea'
];

/** 需要排除的 class/id 关键词 */
const EXCLUDED_PATTERNS = [
  'nav', 'menu', 'sidebar', 'footer', 'header',
  'comment', 'advertisement', 'ad-', 'social',
  'share', 'related', 'recommend', 'popup', 'modal'
];

/** 最大正文字符数 */
const MAX_BODY_LENGTH = 1500;

/**
 * 抓取当前页面内容
 */
export function scrapePageContent(): ScrapedContent {
  return {
    title: getPageTitle(),
    metaDescription: getMetaDescription(),
    h1: getHeadings('h1'),
    h2: getHeadings('h2'),
    bodyText: getBodyText(),
    url: window.location.href,
    lang: getPageLanguage(),
  };
}

/**
 * 获取页面标题
 */
function getPageTitle(): string {
  // 优先使用 og:title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute('content');
    if (content) return content.trim();
  }
  
  // 其次使用 document.title
  return document.title.trim();
}

/**
 * 获取 Meta Description
 */
function getMetaDescription(): string {
  // 优先使用 og:description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    const content = ogDesc.getAttribute('content');
    if (content) return content.trim();
  }
  
  // 其次使用 description
  const desc = document.querySelector('meta[name="description"]');
  if (desc) {
    const content = desc.getAttribute('content');
    if (content) return content.trim();
  }
  
  return '';
}

/**
 * 获取指定级别的标题
 */
function getHeadings(tag: 'h1' | 'h2'): string[] {
  const elements = document.querySelectorAll(tag);
  const headings: string[] = [];
  
  elements.forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 0 && text.length < 200) {
      headings.push(text);
    }
  });
  
  return headings.slice(0, 5); // 最多返回5个
}

/**
 * 获取页面语言
 */
function getPageLanguage(): string {
  // 优先使用 html lang 属性
  const htmlLang = document.documentElement.lang;
  if (htmlLang) return htmlLang.toLowerCase();
  
  // 其次使用 content-language meta
  const langMeta = document.querySelector('meta[http-equiv="content-language"]');
  if (langMeta) {
    const content = langMeta.getAttribute('content');
    if (content) return content.toLowerCase();
  }
  
  return 'en'; // 默认英语
}

/**
 * 获取正文内容
 */
function getBodyText(): string {
  // 尝试找到主要内容区域
  const mainContent = findMainContent();
  
  if (mainContent) {
    return cleanText(mainContent.innerText, MAX_BODY_LENGTH);
  }
  
  // 回退到 body，但排除不需要的区域
  return cleanText(getCleanedBodyText(), MAX_BODY_LENGTH);
}

/**
 * 查找主要内容区域
 */
function findMainContent(): HTMLElement | null {
  // 常见的主内容选择器
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.post-body',
    '.article-body',
  ];
  
  for (const selector of mainSelectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      // 确保内容足够长
      if (element.innerText.length > 100) {
        return element;
      }
    }
  }
  
  return null;
}

/**
 * 获取清洗后的 body 文本
 */
function getCleanedBodyText(): string {
  // 克隆 body 以避免修改原始 DOM
  const clone = document.body.cloneNode(true) as HTMLElement;
  
  // 移除不需要的元素
  EXCLUDED_TAGS.forEach(tag => {
    clone.querySelectorAll(tag).forEach(el => el.remove());
  });
  
  // 移除匹配排除模式的元素
  clone.querySelectorAll('*').forEach(el => {
    const className = el.className.toString().toLowerCase();
    const id = el.id.toLowerCase();
    
    for (const pattern of EXCLUDED_PATTERNS) {
      if (className.includes(pattern) || id.includes(pattern)) {
        el.remove();
        break;
      }
    }
  });
  
  return clone.innerText;
}

/**
 * 清洗文本
 */
function cleanText(text: string, maxLength: number): string {
  return text
    // 移除多余空白
    .replace(/\s+/g, ' ')
    // 移除连续的换行
    .replace(/\n{3,}/g, '\n\n')
    // 去除首尾空白
    .trim()
    // 截断到最大长度
    .slice(0, maxLength);
}

/**
 * 等待页面内容加载（用于 SPA）
 */
export function waitForContent(timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    // 如果已经有足够内容，直接返回
    if (document.body.innerText.length > 500) {
      resolve();
      return;
    }
    
    // 设置超时
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
    
    // 观察 DOM 变化
    const observer = new MutationObserver(() => {
      if (document.body.innerText.length > 500) {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
}
