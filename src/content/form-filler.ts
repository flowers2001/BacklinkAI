// ========================================
// 智能表单填充模块
// ========================================

import type { FillData, FillResult } from '../shared/types';

/** 字段类型 */
type FieldType = 'url' | 'email' | 'name' | 'title' | 'comment';

/** 字段映射配置 */
interface FieldConfig {
  type: FieldType;
  selectors: string[];
  fallbackSelectors?: string[];
}

/** 字段映射表（按优先级排序） */
const FIELD_CONFIGS: FieldConfig[] = [
  {
    type: 'url',
    selectors: [
      'input[name*="url" i]',
      'input[name*="website" i]',
      'input[name*="site" i]',
      'input[name*="link" i]',
      'input[id*="url" i]',
      'input[id*="website" i]',
      'input[placeholder*="url" i]',
      'input[placeholder*="website" i]',
      'input[placeholder*="网址" i]',
      'input[placeholder*="链接" i]',
      'input[type="url"]',
    ],
  },
  {
    type: 'email',
    selectors: [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[name*="mail" i]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[placeholder*="邮箱" i]',
    ],
  },
  {
    type: 'name',
    selectors: [
      'input[name="name"]',
      'input[name="author"]',
      'input[name*="author" i]',
      'input[id*="author" i]',
      'input[name*="nickname" i]',
      'input[placeholder*="name" i]',
      'input[placeholder*="姓名" i]',
      'input[placeholder*="昵称" i]',
    ],
    fallbackSelectors: [
      'input[name*="name" i]',
      'input[id*="name" i]',
    ],
  },
  {
    type: 'title',
    selectors: [
      'input[name*="title" i]',
      'input[id*="title" i]',
      'input[name*="subject" i]',
      'input[placeholder*="title" i]',
      'input[placeholder*="标题" i]',
    ],
  },
  {
    type: 'comment',
    selectors: [
      'textarea[name*="comment" i]',
      'textarea[name*="content" i]',
      'textarea[name*="message" i]',
      'textarea[name*="body" i]',
      'textarea[name*="description" i]',
      'textarea[id*="comment" i]',
      'textarea[id*="content" i]',
      'textarea[id*="description" i]',
      'textarea[placeholder*="comment" i]',
      'textarea[placeholder*="评论" i]',
      'textarea[placeholder*="留言" i]',
      'textarea[placeholder*="描述" i]',
      'div[contenteditable="true"]',
      'textarea', // 通用 textarea 作为最后手段
    ],
  },
];

/** 随机延迟范围 */
const DELAY_RANGE = { min: 30, max: 80 };

/**
 * 辅助函数：随机延迟
 */
function randomDelay(): Promise<void> {
  const delay = Math.random() * (DELAY_RANGE.max - DELAY_RANGE.min) + DELAY_RANGE.min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 查找表单字段
 */
function findField(config: FieldConfig): HTMLElement | null {
  // 首先尝试主选择器
  for (const selector of config.selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement && isVisible(element) && !isReadonly(element)) {
      return element;
    }
  }
  
  // 尝试后备选择器
  if (config.fallbackSelectors) {
    for (const selector of config.fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement && isVisible(element) && !isReadonly(element)) {
        return element;
      }
    }
  }
  
  return null;
}

/**
 * 检查元素是否可见
 */
function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

/**
 * 检查元素是否只读
 */
function isReadonly(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.readOnly || element.disabled;
  }
  return false;
}

/**
 * 填充单个字段
 */
async function fillSingleField(element: HTMLElement, value: string): Promise<void> {
  // 聚焦元素
  element.focus();
  await randomDelay();
  
  // 根据元素类型填充
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // 清空现有内容
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await randomDelay();
    
    // 设置新值
    element.value = value;
    
    // 触发事件链（模拟真实输入）
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 对于 React/Vue 等框架，需要触发更多事件
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: value,
    });
    element.dispatchEvent(inputEvent);
    
  } else if (element.isContentEditable) {
    // 处理 contenteditable 元素
    element.textContent = '';
    await randomDelay();
    element.textContent = value;
    
    // 触发事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  // 失焦
  await randomDelay();
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

/**
 * 填充表单
 */
export async function fillForm(data: FillData): Promise<FillResult> {
  const filledFields: string[] = [];
  const missingFields: string[] = [];
  const errors: string[] = [];
  
  // 字段值映射
  const fieldValues: Record<FieldType, string> = {
    url: data.url,
    email: data.email,
    name: data.name,
    title: data.title,
    comment: data.content,
  };
  
  // 遍历所有字段配置
  for (const config of FIELD_CONFIGS) {
    const value = fieldValues[config.type];
    
    // 跳过空值
    if (!value) {
      continue;
    }
    
    try {
      const element = findField(config);
      
      if (element) {
        await fillSingleField(element, value);
        filledFields.push(config.type);
        
        // 添加随机延迟，模拟人类行为
        await randomDelay();
        await randomDelay();
      } else {
        missingFields.push(config.type);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${config.type}: ${message}`);
    }
  }
  
  return {
    success: filledFields.length > 0,
    filledFields,
    missingFields,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/** 字段检测结果 */
export interface DetectedField {
  type: FieldType | string;
  name: string;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  inputType?: string;
}

/**
 * 检测页面上的可填充表单（增强版：检测所有字段）
 */
export function detectForms(): { hasForm: boolean; fields: FieldType[]; detailedFields: DetectedField[] } {
  const fields: FieldType[] = [];
  const detailedFields: DetectedField[] = [];
  const seenElements = new Set<HTMLElement>();
  
  // 1. 先检测预定义的字段类型
  for (const config of FIELD_CONFIGS) {
    const element = findField(config);
    if (element) {
      fields.push(config.type);
      seenElements.add(element);
      
      const fieldInfo: DetectedField = {
        type: config.type,
        name: getFieldDisplayName(config.type),
      };
      
      // 检测 maxlength
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
      
      detailedFields.push(fieldInfo);
    }
  }
  
  // 2. 扫描所有表单字段，找出未识别的
  const allInputs = document.querySelectorAll('input, textarea, select');
  for (const el of allInputs) {
    if (!(el instanceof HTMLElement) || seenElements.has(el)) continue;
    if (!isVisible(el)) continue;
    
    const inputType = el.getAttribute('type') || 'text';
    // 跳过不需要的类型
    if (['hidden', 'submit', 'button', 'reset', 'image', 'file', 'checkbox', 'radio'].includes(inputType)) {
      continue;
    }
    
    const fieldName = guessFieldName(el);
    if (!fieldName) continue;
    
    const fieldInfo: DetectedField = {
      type: 'other',
      name: fieldName,
      inputType: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : inputType,
    };
    
    const maxLength = el.getAttribute('maxlength');
    if (maxLength) {
      fieldInfo.maxLength = parseInt(maxLength, 10);
    }
    
    if (!fieldInfo.maxLength) {
      const limitFromText = findCharLimitFromContext(el);
      if (limitFromText) {
        fieldInfo.maxLength = limitFromText;
      }
    }
    
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      fieldInfo.placeholder = placeholder;
    }
    
    if (el.hasAttribute('required') || el.getAttribute('aria-required') === 'true') {
      fieldInfo.required = true;
    }
    
    detailedFields.push(fieldInfo);
  }
  
  return {
    hasForm: detailedFields.length > 0,
    fields,
    detailedFields,
  };
}

/**
 * 猜测字段名称
 */
function guessFieldName(element: HTMLElement): string | null {
  // 优先从 label 获取
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label && label.textContent) {
      return label.textContent.trim().replace(/[*:：]$/g, '').trim();
    }
  }
  
  // 从 name 属性
  const name = element.getAttribute('name');
  if (name) {
    return formatFieldName(name);
  }
  
  // 从 placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) {
    return placeholder.slice(0, 30);
  }
  
  // 从 aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }
  
  // 从父元素的 label
  const parent = element.parentElement;
  if (parent) {
    const parentLabel = parent.querySelector('label');
    if (parentLabel && parentLabel.textContent) {
      return parentLabel.textContent.trim().replace(/[*:：]$/g, '').trim();
    }
  }
  
  return null;
}

/**
 * 格式化字段名称
 */
function formatFieldName(name: string): string {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * 获取预定义字段的显示名称
 */
function getFieldDisplayName(type: FieldType): string {
  const names: Record<FieldType, string> = {
    url: '网址 (URL)',
    email: '邮箱 (Email)',
    name: '姓名 (Name)',
    title: '标题 (Title)',
    comment: '描述/评论 (Description)',
  };
  return names[type] || type;
}

/**
 * 从元素附近的文本中查找字数限制
 */
function findCharLimitFromContext(element: HTMLElement): number | null {
  // 检查父元素和兄弟元素中的提示文字
  const parent = element.parentElement;
  if (!parent) return null;
  
  // 获取附近的文本内容
  const nearbyText = parent.textContent || '';
  
  // 匹配常见的字数限制模式
  const patterns = [
    /最[多长大](\d+)[字个]/,           // 最多500字、最长200个
    /不超过(\d+)[字个]/,               // 不超过300字
    /(\d+)[字个]以内/,                 // 500字以内
    /(\d+)\s*characters?/i,            // 500 characters
    /max[imum]*\s*(\d+)/i,             // max 500, maximum 500
    /limit[ed]*\s*[to]*\s*(\d+)/i,     // limit 500, limited to 500
    /up\s*to\s*(\d+)/i,                // up to 500
    /(\d+)\s*char[acter]*s?\s*max/i,   // 500 chars max
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
  
  // 检查 label 元素
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

/**
 * 高亮显示已识别的表单字段（调试用）
 */
export function highlightFields(): void {
  for (const config of FIELD_CONFIGS) {
    const element = findField(config);
    if (element) {
      element.style.outline = '2px solid #4f46e5';
      element.style.outlineOffset = '2px';
    }
  }
}

/**
 * 清除字段高亮
 */
export function clearHighlights(): void {
  for (const config of FIELD_CONFIGS) {
    const element = findField(config);
    if (element) {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }
  }
}

/**
 * 定位到表单位置并高亮
 */
export function scrollToForm(): { success: boolean; message: string } {
  // 优先找评论/描述类的 textarea（最重要的字段）
  const commentConfig = FIELD_CONFIGS.find(c => c.type === 'comment');
  let targetElement: HTMLElement | null = null;

  if (commentConfig) {
    targetElement = findField(commentConfig);
  }

  // 如果没找到评论框，尝试找其他任意字段
  if (!targetElement) {
    for (const config of FIELD_CONFIGS) {
      const element = findField(config);
      if (element) {
        targetElement = element;
        break;
      }
    }
  }

  // 还是没找到，尝试通用选择器
  if (!targetElement) {
    const genericSelectors = [
      'textarea',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="url"]',
      'div[contenteditable="true"]',
    ];
    
    for (const selector of genericSelectors) {
      const element = document.querySelector(selector);
      if (element instanceof HTMLElement && isVisible(element)) {
        targetElement = element;
        break;
      }
    }
  }

  if (targetElement) {
    // 滚动到元素位置
    targetElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // 高亮显示
    const originalOutline = targetElement.style.outline;
    const originalOutlineOffset = targetElement.style.outlineOffset;
    const originalBackground = targetElement.style.backgroundColor;
    
    targetElement.style.outline = '3px solid #e67e22';
    targetElement.style.outlineOffset = '4px';
    targetElement.style.backgroundColor = '#fff8f0';

    // 3秒后移除高亮
    setTimeout(() => {
      if (targetElement) {
        targetElement.style.outline = originalOutline;
        targetElement.style.outlineOffset = originalOutlineOffset;
        targetElement.style.backgroundColor = originalBackground;
      }
    }, 3000);

    // 聚焦
    targetElement.focus();

    return { success: true, message: '已定位到表单' };
  }

  return { success: false, message: '未找到表单' };
}
