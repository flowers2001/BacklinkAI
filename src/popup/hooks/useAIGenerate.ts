import { useState, useCallback } from 'react';
import type { WorkMode, AppStatus, ScrapedContent, FillData, FillResult, ProjectInfo, StorageConfig } from '../../shared/types';

interface UseAIGenerateReturn {
  status: AppStatus;
  message: string;
  content: string;
  fillResult: FillResult | null;
  setContent: (content: string) => void;
  generate: (mode: WorkMode) => Promise<void>;
  fill: () => Promise<void>;
}

export function useAIGenerate(): UseAIGenerateReturn {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [message, setMessage] = useState('就绪 - 点击下方按钮开始');
  const [content, setContent] = useState('');
  const [fillResult, setFillResult] = useState<FillResult | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  
  /**
   * 获取当前标签页 ID
   */
  const getCurrentTabId = useCallback(async (): Promise<number> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('无法获取当前标签页');
    }
    return tab.id;
  }, []);
  
  /**
   * 抓取页面内容
   */
  const scrapePage = useCallback(async (tabId: number): Promise<ScrapedContent> => {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_PAGE' });
    
    if (!response.success) {
      throw new Error(response.error || '抓取失败');
    }
    
    return response.data;
  }, []);
  
  /**
   * 调用 AI 生成内容
   */
  const generateContent = useCallback(async (
    mode: WorkMode,
    pageContent: ScrapedContent,
    project: ProjectInfo
  ): Promise<string> => {
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_CONTENT',
      payload: {
        mode,
        pageContent,
        projectInfo: project,
      },
    });
    
    if (!response.success) {
      throw new Error(response.error || '生成失败');
    }
    
    return response.content;
  }, []);
  
  /**
   * 填充表单
   */
  const fillForm = useCallback(async (tabId: number, data: FillData): Promise<FillResult> => {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'FILL_FORM',
      payload: data,
    });
    
    return response;
  }, []);
  
  /**
   * 主流程：生成内容
   */
  const generate = useCallback(async (mode: WorkMode) => {
    try {
      // 重置状态
      setContent('');
      setFillResult(null);
      
      // 获取配置
      setStatus('idle');
      setMessage('正在检查配置...');
      
      const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' }) as { success: boolean; data?: StorageConfig; error?: string };
      
      if (!configResponse.success || !configResponse.data) {
        throw new Error('无法获取配置');
      }
      
      const config = configResponse.data;
      
      // 检查项目信息
      if (!config.project.targetUrl) {
        throw new Error('请先在设置中配置推广网址');
      }
      
      setProjectInfo(config.project);
      
      // Step 1: 抓取页面
      setStatus('scraping');
      setMessage('正在抓取页面内容...');
      
      const tabId = await getCurrentTabId();
      const pageContent = await scrapePage(tabId);
      
      // Step 2: AI 生成
      setStatus('generating');
      setMessage('正在生成内容...');
      
      const generatedContent = await generateContent(mode, pageContent, config.project);
      
      setContent(generatedContent);
      setStatus('success');
      setMessage('生成完成！可以编辑后点击"填充表单"');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus('error');
      setMessage(errorMessage);
      
      // 如果是配置问题，引导用户去设置
      if (errorMessage.includes('推广网址')) {
        setMessage(errorMessage + ' (点击右上角设置)');
      }
    }
  }, [getCurrentTabId, scrapePage, generateContent]);
  
  /**
   * 主流程：填充表单
   */
  const fill = useCallback(async () => {
    if (!content || !projectInfo) {
      setStatus('error');
      setMessage('没有可填充的内容');
      return;
    }
    
    try {
      setStatus('filling');
      setMessage('正在填充表单...');
      
      const tabId = await getCurrentTabId();
      
      const fillData: FillData = {
        url: projectInfo.targetUrl,
        email: projectInfo.email,
        sitename: projectInfo.brandName || '',
        author: projectInfo.name || '',
        title: projectInfo.title || '',
        tagline: projectInfo.tagline || '',
        content: content,
      };
      
      const result = await fillForm(tabId, fillData);
      setFillResult(result);
      
      if (result.success) {
        const filledCount = result.filledFields.length;
        const missedCount = result.missingFields.length;
        
        setStatus('success');
        setMessage(`填充完成！已填充 ${filledCount} 个字段${missedCount > 0 ? `，${missedCount} 个字段未找到` : ''}`);
      } else {
        setStatus('error');
        setMessage('填充失败：未找到可填充的表单字段');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus('error');
      setMessage(`填充失败: ${errorMessage}`);
    }
  }, [content, projectInfo, getCurrentTabId, fillForm]);
  
  return {
    status,
    message,
    content,
    fillResult,
    setContent,
    generate,
    fill,
  };
}
