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

/**
 * 检测页面上的可填充表单
 */
export function detectForms(): { hasForm: boolean; fields: FieldType[] } {
  const fields: FieldType[] = [];
  
  for (const config of FIELD_CONFIGS) {
    const element = findField(config);
    if (element) {
      fields.push(config.type);
    }
  }
  
  return {
    hasForm: fields.length > 0,
    fields,
  };
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
