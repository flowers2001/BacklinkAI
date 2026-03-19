// ========================================
// 智能表单填充模块 - 加权评分算法
// ========================================

import type { FillData, FillResult } from '../shared/types';

/** 字段类型 */
type FieldType = 'url' | 'email' | 'sitename' | 'author' | 'title' | 'tagline' | 'comment';

// ========================================
// 字段特征库 (Field Schema)
// ========================================

interface FieldSchema {
  type: FieldType;
  keywords: string[];
  inputTypes?: string[];
  tagPreference?: 'input' | 'textarea' | 'any';
}

/** 字段特征映射表 */
const FIELD_MAP: FieldSchema[] = [
  {
    type: 'url',
    keywords: ['url', 'link', 'website', 'site', 'href', 'homepage', '网址', '网站', '地址', '链接', '域名'],
    inputTypes: ['url', 'text'],
    tagPreference: 'input',
  },
  {
    type: 'email',
    keywords: ['email', 'mail', 'e-mail', '邮箱', '邮件'],
    inputTypes: ['email', 'text'],
    tagPreference: 'input',
  },
  {
    type: 'sitename',
    keywords: ['sitename', 'site_name', 'site-name', 'websitename', 'website_name', 'webname', 'web_name', 'project', 'projectname', 'project_name', 'project-name', 'brand', 'company', 'organization', 'appname', 'app_name', 'app-name', 'productname', 'product_name', '网站名', '站点名', '品牌', '公司', '企业', '项目名', '应用名', '产品名'],
    inputTypes: ['text'],
    tagPreference: 'input',
  },
  {
    type: 'author',
    keywords: ['author', 'owner', 'creator', 'submitter', 'publisher', 'contributor', 'your_name', 'your-name', 'yourname', 'fullname', 'full_name', 'full-name', '作者', '所有者', '创建者', '提交者', '发布者'],
    inputTypes: ['text'],
    tagPreference: 'input',
  },
  {
    type: 'title',
    keywords: ['title', 'subject', 'headline', 'heading', 'project_title', 'project-title', 'site_title', 'site-title', '标题', '主题', '项目标题', '网站标题'],
    inputTypes: ['text'],
    tagPreference: 'input',
  },
  {
    type: 'tagline',
    keywords: ['tagline', 'slogan', 'motto', 'subtitle', 'short', 'short_desc', 'short-desc', 'short_description', 'short-description', 'brief', 'pitch', 'catchphrase', 'oneliner', 'one-liner', '标语', '副标题', '简述', '口号', '宣传语', '一句话介绍', '短描述'],
    inputTypes: ['text'],
    tagPreference: 'any',
  },
  {
    type: 'comment',
    keywords: ['comment', 'content', 'message', 'body', 'description', 'desc', 'intro', 'summary', 'text', 'note', '评论', '留言', '描述', '简介', '内容', '介绍', '说明'],
    tagPreference: 'textarea',
  },
];

// ========================================
// 评分配置
// ========================================

const SCORE_WEIGHTS = {
  ATTRIBUTE: 40,      // 属性匹配 (id, name, class, placeholder)
  LABEL_TEXT: 40,     // 标签/邻近文本匹配
  TYPE_BONUS: 20,     // 类型加成
};

const MIN_SCORE_THRESHOLD = 25;  // 最低分数阈值

// ========================================
// 评分引擎 (Scoring Engine)
// ========================================

interface ScoredElement {
  element: HTMLElement;
  score: number;
  matchDetails: string[];
}

/**
 * 计算元素与字段的匹配分数
 */
function calculateScore(element: HTMLElement, schema: FieldSchema): ScoredElement {
  let score = 0;
  const matchDetails: string[] = [];
  
  const tagName = element.tagName.toLowerCase();
  const inputType = element.getAttribute('type')?.toLowerCase() || 'text';
  
  // 🎯 绝对优先：精确类型匹配（999 分直接锁定）
  if (schema.type === 'email' && tagName === 'input' && inputType === 'email') {
    return { element, score: 999, matchDetails: ['type="email" 强制匹配'] };
  }
  
  // 1. 属性分 (40分) - 检查 id, name, class, placeholder
  const attributeScore = calculateAttributeScore(element, schema.keywords);
  if (attributeScore > 0) {
    score += attributeScore;
    matchDetails.push(`属性匹配: +${attributeScore}`);
  }
  
  // 2. 邻近文本分 (40分) - 检查 label 和父元素文本
  const labelScore = calculateLabelScore(element, schema.keywords);
  if (labelScore > 0) {
    score += labelScore;
    matchDetails.push(`文本匹配: +${labelScore}`);
  }
  
  // 3. 类型加成分 (20分)
  const typeBonus = calculateTypeBonus(element, schema);
  if (typeBonus > 0) {
    score += typeBonus;
    matchDetails.push(`类型加成: +${typeBonus}`);
  }
  
  // 4. 值格式加成（针对邮箱字段）
  if (schema.type === 'email') {
    const value = (element as HTMLInputElement).value || '';
    if (value.includes('@') && value.includes('.')) {
      score += 30;
      matchDetails.push('邮箱格式: +30');
    }
  }
  
  return { element, score, matchDetails };
}

/**
 * 计算属性匹配分数
 */
function calculateAttributeScore(element: HTMLElement, keywords: string[]): number {
  const attrs = [
    element.id?.toLowerCase() || '',
    element.getAttribute('name')?.toLowerCase() || '',
    element.className?.toString().toLowerCase() || '',
    element.getAttribute('placeholder')?.toLowerCase() || '',
    element.getAttribute('aria-label')?.toLowerCase() || '',
  ];
  
  const combinedAttrs = attrs.join(' ');
  let matchCount = 0;
  
  for (const keyword of keywords) {
    if (combinedAttrs.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  
  if (matchCount === 0) return 0;
  
  // 根据匹配数量计算分数，最高 40 分
  return Math.min(SCORE_WEIGHTS.ATTRIBUTE, matchCount * 15);
}

/**
 * 计算标签/邻近文本匹配分数
 */
function calculateLabelScore(element: HTMLElement, keywords: string[]): number {
  let score = 0;
  
  // 1. 检查关联的 <label>
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      const labelText = label.textContent?.toLowerCase() || '';
      for (const keyword of keywords) {
        if (labelText.includes(keyword.toLowerCase())) {
          score += 20;
          break;
        }
      }
    }
  }
  
  // 2. 向上查找多层父元素中的 label（最多 5 层，应对深层嵌套的富文本编辑器）
  let ancestor = element.parentElement;
  let depth = 0;
  while (ancestor && depth < 5) {
    const ancestorLabel = ancestor.querySelector('label');
    if (ancestorLabel) {
      const labelText = ancestorLabel.textContent?.toLowerCase() || '';
      for (const keyword of keywords) {
        if (labelText.includes(keyword.toLowerCase())) {
          score += (depth === 0 ? 15 : 10);  // 直接父元素给 15 分，更远的给 10 分
          break;
        }
      }
      if (score > 0) break;  // 找到匹配就停止
    }
    ancestor = ancestor.parentElement;
    depth++;
  }
  
  // 3. 检查父元素的 innerText（前 100 字符）
  const parent = element.parentElement;
  if (parent) {
    const parentText = parent.textContent?.slice(0, 100).toLowerCase() || '';
    for (const keyword of keywords) {
      if (parentText.includes(keyword.toLowerCase())) {
        score += 10;
        break;
      }
    }
  }
  
  // 4. 检查前一个兄弟元素（常见的 label 位置）
  const prevSibling = element.previousElementSibling;
  if (prevSibling) {
    const siblingText = prevSibling.textContent?.toLowerCase() || '';
    for (const keyword of keywords) {
      if (siblingText.includes(keyword.toLowerCase())) {
        score += 10;
        break;
      }
    }
  }
  
  return Math.min(SCORE_WEIGHTS.LABEL_TEXT, score);
}

/**
 * 计算类型加成分数
 */
function calculateTypeBonus(element: HTMLElement, schema: FieldSchema): number {
  const tagName = element.tagName.toLowerCase();
  const inputType = element.getAttribute('type')?.toLowerCase() || 'text';
  
  // any 偏好：任何可编辑元素都给加成
  if (schema.tagPreference === 'any') {
    if (tagName === 'input' || tagName === 'textarea' || element.isContentEditable) {
      return SCORE_WEIGHTS.TYPE_BONUS;
    }
  }
  
  // textarea 偏好
  if (schema.tagPreference === 'textarea' && tagName === 'textarea') {
    return SCORE_WEIGHTS.TYPE_BONUS;
  }
  
  // input 类型偏好
  if (schema.tagPreference === 'input' && tagName === 'input') {
    if (schema.inputTypes?.includes(inputType)) {
      return SCORE_WEIGHTS.TYPE_BONUS;
    }
    // 即使类型不完全匹配，input 也给一半分
    return SCORE_WEIGHTS.TYPE_BONUS / 2;
  }
  
  // contenteditable 对于 comment 和 tagline 类型
  if ((schema.type === 'comment' || schema.type === 'tagline') && element.isContentEditable) {
    return SCORE_WEIGHTS.TYPE_BONUS;
  }
  
  return 0;
}

// ========================================
// 字段查找 (基于评分)
// ========================================

/**
 * 查找最匹配的表单字段
 */
function findBestMatch(schema: FieldSchema, excludeElements: Set<HTMLElement> = new Set()): ScoredElement | null {
  // 获取所有可能的表单元素
  const candidates = document.querySelectorAll('input, textarea, [contenteditable="true"]');
  
  let bestMatch: ScoredElement | null = null;
  const allScores: { element: HTMLElement; score: number; details: string[] }[] = [];
  
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    if (excludeElements.has(el)) continue;
    if (!isVisible(el)) continue;
    if (isReadonly(el)) continue;
    
    // 排除不需要的 input 类型
    if (el instanceof HTMLInputElement) {
      const type = el.type.toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'image', 'file', 'checkbox', 'radio'].includes(type)) {
        continue;
      }
    }
    
    const scored = calculateScore(el, schema);
    allScores.push({ element: el, score: scored.score, details: scored.matchDetails });
    
    if (scored.score >= MIN_SCORE_THRESHOLD) {
      if (!bestMatch || scored.score > bestMatch.score) {
        bestMatch = scored;
      }
    }
  }
  
  // 调试日志：输出所有候选元素的评分
  console.log(`[字段识别] ${schema.type} 字段评分详情：`);
  allScores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .forEach(s => {
      const el = s.element as HTMLInputElement;
      console.log(`  - 分数: ${s.score} | 元素: <${el.tagName.toLowerCase()} name="${el.name}" id="${el.id}" type="${el.type}"> | 匹配: ${s.details.join(', ')}`);
    });
  
  return bestMatch;
}

// ========================================
// 辅助函数
// ========================================

/** 随机延迟范围 */
const DELAY_RANGE = { min: 30, max: 80 };

function randomDelay(): Promise<void> {
  const delay = Math.random() * (DELAY_RANGE.max - DELAY_RANGE.min) + DELAY_RANGE.min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

function isReadonly(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.readOnly || element.disabled;
  }
  return false;
}

// ========================================
// 填充逻辑
// ========================================

/**
 * 填充单个字段
 */
async function fillSingleField(element: HTMLElement, value: string): Promise<void> {
  element.focus();
  await randomDelay();
  
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await randomDelay();
    
    element.value = value;
    
    // 触发完整的事件链，确保 React/Vue 等框架能响应
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: value,
    });
    element.dispatchEvent(inputEvent);
    
  } else if (element.isContentEditable) {
    element.textContent = '';
    await randomDelay();
    element.textContent = value;
    
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await randomDelay();
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * 填充表单（使用评分算法）
 */
export async function fillForm(data: FillData, mode?: 'comment' | 'directory'): Promise<FillResult> {
  const filledFields: string[] = [];
  const missingFields: string[] = [];
  const errors: string[] = [];
  const usedElements = new Set<HTMLElement>();
  
  const fieldValues: Record<FieldType, string> = {
    url: data.url,
    email: data.email,
    sitename: data.sitename,
    author: data.author,
    title: data.title,
    tagline: data.tagline,
    comment: data.content,
  };
  
  // 根据模式选择要填充的字段
  let fieldsToFill: FieldType[];
  if (mode === 'comment') {
    fieldsToFill = ['url', 'author', 'email', 'comment'];
  } else {
    fieldsToFill = ['url', 'sitename', 'author', 'email', 'title', 'tagline', 'comment'];
  }
  
  for (const schema of FIELD_MAP) {
    // 跳过不在当前模式字段列表中的字段
    if (!fieldsToFill.includes(schema.type)) {
      continue;
    }
    
    const value = fieldValues[schema.type];
    
    if (!value) continue;
    
    try {
      const match = findBestMatch(schema, usedElements);
      
      if (match) {
        await fillSingleField(match.element, value);
        filledFields.push(schema.type);
        usedElements.add(match.element);
        
        console.log(`[AI外链助手] 填充 ${schema.type}: 得分 ${match.score}`, match.matchDetails);
        
        await randomDelay();
        await randomDelay();
      } else {
        missingFields.push(schema.type);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${schema.type}: ${message}`);
    }
  }
  
  return {
    success: filledFields.length > 0,
    filledFields,
    missingFields,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ========================================
// 表单检测
// ========================================

export interface DetectedField {
  type: FieldType;
  name: string;
  found: boolean;
  score?: number;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
}

/**
 * 检测页面上的可填充表单（根据模式检测不同字段）
 */
export function detectForms(mode?: 'comment' | 'directory'): { hasForm: boolean; fields: FieldType[]; detailedFields: DetectedField[] } {
  const fields: FieldType[] = [];
  const detailedFields: DetectedField[] = [];
  const usedElements = new Set<HTMLElement>();
  
  // 根据模式选择要检测的字段
  let fieldsToDetect: FieldType[];
  if (mode === 'comment') {
    // 评论模式：url, author(评论者), email, comment
    fieldsToDetect = ['url', 'author', 'email', 'comment'];
  } else {
    // 导航站模式：url, sitename(网站名), author(联系人), email, title, tagline(简短描述), comment
    fieldsToDetect = ['url', 'sitename', 'author', 'email', 'title', 'tagline', 'comment'];
  }
  
  for (const schema of FIELD_MAP) {
    if (!fieldsToDetect.includes(schema.type)) continue;
    
    const match = findBestMatch(schema, usedElements);
    
    const fieldInfo: DetectedField = {
      type: schema.type,
      name: getFieldDisplayName(schema.type),
      found: !!match,
      score: match?.score,
    };
    
    if (match) {
      fields.push(schema.type);
      usedElements.add(match.element);
      
      const element = match.element;
      
      const maxLength = element.getAttribute('maxlength');
      if (maxLength) {
        fieldInfo.maxLength = parseInt(maxLength, 10);
      }
      
      if (!fieldInfo.maxLength) {
        const limitFromText = findCharLimitFromContext(element);
        if (limitFromText) {
          fieldInfo.maxLength = limitFromText;
        }
      }
      
      const placeholder = element.getAttribute('placeholder');
      if (placeholder) {
        fieldInfo.placeholder = placeholder;
      }
      
      if (element.hasAttribute('required') || element.getAttribute('aria-required') === 'true') {
        fieldInfo.required = true;
      }
    }
    
    detailedFields.push(fieldInfo);
  }
  
  return {
    hasForm: fields.length > 0,
    fields,
    detailedFields,
  };
}

function getFieldDisplayName(type: FieldType): string {
  const names: Record<FieldType, string> = {
    url: '网址 (URL)',
    email: '邮箱 (Email)',
    sitename: '网站名 (Site)',
    author: '联系人 (Author)',
    title: '标题 (Title)',
    tagline: '标语 (Tagline)',
    comment: '描述 (Description)',
  };
  return names[type] || type;
}

function findCharLimitFromContext(element: HTMLElement): number | null {
  const parent = element.parentElement;
  if (!parent) return null;
  
  const nearbyText = parent.textContent || '';
  
  const patterns = [
    /最[多长大](\d+)[字个]/,
    /不超过(\d+)[字个]/,
    /(\d+)[字个]以内/,
    /(\d+)\s*characters?/i,
    /max[imum]*\s*(\d+)/i,
    /limit[ed]*\s*[to]*\s*(\d+)/i,
    /up\s*to\s*(\d+)/i,
    /(\d+)\s*char[acter]*s?\s*max/i,
  ];
  
  for (const pattern of patterns) {
    const match = nearbyText.match(pattern);
    if (match && match[1]) {
      const limit = parseInt(match[1], 10);
      if (limit > 0 && limit < 100000) {
        return limit;
      }
    }
  }
  
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      const labelText = label.textContent || '';
      for (const pattern of patterns) {
        const match = labelText.match(pattern);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      }
    }
  }
  
  return null;
}

// ========================================
// 定位到表单
// ========================================

export function scrollToForm(mode?: 'comment' | 'directory'): { success: boolean; message: string } {
  const foundElements: HTMLElement[] = [];
  const usedElements = new Set<HTMLElement>();
  let primaryTarget: HTMLElement | null = null;
  
  // 根据模式选择要检测的字段
  let fieldsToDetect: FieldType[];
  if (mode === 'comment') {
    fieldsToDetect = ['url', 'author', 'email', 'comment'];
  } else {
    fieldsToDetect = ['url', 'sitename', 'author', 'email', 'title', 'tagline', 'comment'];
  }
  
  // 找到所有匹配的字段
  for (const schema of FIELD_MAP) {
    // 跳过不在当前模式字段列表中的字段
    if (!fieldsToDetect.includes(schema.type)) {
      continue;
    }
    
    const match = findBestMatch(schema, usedElements);
    if (match) {
      foundElements.push(match.element);
      usedElements.add(match.element);
      
      // 优先滚动到评论/描述字段
      if (!primaryTarget && schema.type === 'comment') {
        primaryTarget = match.element;
      }
    }
  }
  
  // 如果没有评论字段，使用第一个找到的字段
  if (!primaryTarget && foundElements.length > 0) {
    primaryTarget = foundElements[0];
  }
  
  if (foundElements.length === 0) {
    return { success: false, message: '未找到表单字段' };
  }
  
  // 滚动到主要字段
  if (primaryTarget) {
    primaryTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    primaryTarget.focus();
  }
  
  // 高亮所有找到的字段
  const originalStyles = new Map<HTMLElement, { outline: string; outlineOffset: string; background: string }>();
  
  for (const element of foundElements) {
    // 保存原始样式
    originalStyles.set(element, {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      background: element.style.backgroundColor,
    });
    
    // 应用高亮样式
    element.style.outline = '3px solid #e67e22';
    element.style.outlineOffset = '4px';
    element.style.backgroundColor = '#fff8f0';
  }
  
  // 3秒后清除高亮
  setTimeout(() => {
    for (const element of foundElements) {
      const original = originalStyles.get(element);
      if (original) {
        element.style.outline = original.outline;
        element.style.outlineOffset = original.outlineOffset;
        element.style.backgroundColor = original.background;
      }
    }
  }, 3000);
  
  return { 
    success: true, 
    message: `已定位到 ${foundElements.length} 个表单字段` 
  };
}

// ========================================
// 调试工具
// ========================================

export function highlightFields(): void {
  for (const schema of FIELD_MAP) {
    const match = findBestMatch(schema);
    if (match) {
      match.element.style.outline = '2px solid #4f46e5';
      match.element.style.outlineOffset = '2px';
      console.log(`[AI外链助手] ${schema.type}: 得分 ${match.score}`, match.matchDetails);
    }
  }
}

export function clearHighlights(): void {
  const elements = document.querySelectorAll('input, textarea, [contenteditable="true"]');
  elements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  });
}

/**
 * 高亮单个字段
 */
export function highlightSingleField(fieldType: string): { success: boolean; message: string } {
  const schema = FIELD_MAP.find(s => s.type === fieldType);
  if (!schema) {
    return { success: false, message: '未知字段类型' };
  }
  
  const match = findBestMatch(schema);
  if (!match) {
    return { success: false, message: '未找到该字段' };
  }
  
  const element = match.element;
  
  // 滚动到字段位置
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // 保存原始样式
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;
  const originalBackground = element.style.backgroundColor;
  
  // 应用高亮样式
  element.style.outline = '3px solid #e67e22';
  element.style.outlineOffset = '4px';
  element.style.backgroundColor = '#fff8f0';
  
  // 3秒后清除高亮
  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
    element.style.backgroundColor = originalBackground;
  }, 3000);
  
  // 聚焦
  element.focus();
  
  return { success: true, message: `已定位到${getFieldDisplayName(fieldType as FieldType)}` };
}
