import { useState, useCallback, useEffect } from 'react';
import type { WorkMode, ScrapedContent } from '../shared/types';
import { getCurrentUser } from '../lib/supabase';
import { getPromotionSites, getActiveSite } from '../models/promotion-sites';
import { createBacklink } from '../models/backlinks';
import type { PromotionSite } from '../shared/supabase-types';

interface FormFieldInfo {
  name: string;
  type: string;
  found: boolean;
  score?: number;
  maxLength?: number;
  required?: boolean;
}

function App() {
  const [mode, setMode] = useState<WorkMode>('comment');
  const [pageContent, setPageContent] = useState<ScrapedContent | null>(null);
  const [formFields, setFormFields] = useState<FormFieldInfo[]>([]);
  const [charLimitInput, setCharLimitInput] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [originalComment, setOriginalComment] = useState('');
  const [chineseComment, setChineseComment] = useState('');
  
  // Toast 提示状态
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [showToast, setShowToast] = useState(false);
  
  // Supabase 相关状态
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<PromotionSite[]>([]);
  const [activeSite, setActiveSite] = useState<PromotionSite | null>(null);

  // Toast 提示函数
  const showToastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 加载用户和推广网站
  useEffect(() => {
    loadUserAndSites();
    loadSavedComments();
  }, []);

  // 从 storage 恢复之前保存的评论
  const loadSavedComments = async () => {
    try {
      const result = await chrome.storage.local.get(['saved_comment_original', 'saved_comment_chinese']);
      console.log('[Sidepanel] 恢复评论 from storage:', {
        hasOriginal: !!result.saved_comment_original,
        hassChinese: !!result.saved_comment_chinese,
        originalLength: result.saved_comment_original?.length || 0,
        chineseLength: result.saved_comment_chinese?.length || 0,
      });
      
      if (result.saved_comment_original) {
        console.log('[Sidepanel] 设置 originalComment:', result.saved_comment_original.substring(0, 50));
        setOriginalComment(result.saved_comment_original);
      }
      if (result.saved_comment_chinese) {
        console.log('[Sidepanel] 设置 chineseComment:', result.saved_comment_chinese.substring(0, 50));
        setChineseComment(result.saved_comment_chinese);
      }
    } catch (error) {
      console.error('加载保存的评论失败:', error);
    }
  };

  // 监听 storage 变化（当用户在设置页添加/修改推广网站时自动刷新）
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.supabase_user) {
        console.log('[Sidepanel] 检测到用户登录/登出，刷新用户数据...');
        loadUserAndSites();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const loadUserAndSites = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userSites = await getPromotionSites(currentUser.id);
        setSites(userSites);
        
        // 获取激活的网站
        const active = await getActiveSite(currentUser.id);
        setActiveSite(active);
      } else {
        // 未登录，清空数据
        setUser(null);
        setSites([]);
        setActiveSite(null);
      }
    } catch (error) {
      console.error('❌ 加载用户数据失败:', error);
      // 出错时也清空数据
      setUser(null);
      setSites([]);
      setActiveSite(null);
    }
  };

  // 自动提取（不显示状态消息）
  const handleExtractAuto = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.url?.startsWith('chrome://')) return;

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
      if (response.success) {
        setPageContent(response.data);
      }
    } catch (e) {
      // 静默失败
    }
  }, []);

  // 自动检测表单（不显示状态消息）
  const handleDetectFormAuto = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.url?.startsWith('chrome://')) return;

      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'DETECT_FORM',
        payload: { mode }
      });
      if (response.success) {
        setFormFields(response.fields || []);
      }
    } catch (e) {
      // 静默失败
    }
  }, [mode]);

  // 打开时自动提取/检测 + 监听标签页变化
  useEffect(() => {
    // 两个模式都自动提取和检测
    handleExtractAuto();
    handleDetectFormAuto();

    // 监听标签页变化
    const handleTabChange = () => {
      setPageContent(null);
      setFormFields([]);
      // 不清空评论，让用户可以跨页面使用同一个评论
      // setOriginalComment('');
      // setChineseComment('');
      setTimeout(() => {
        handleExtractAuto();
        handleDetectFormAuto();
      }, 500);
    };

    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);
    
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
    };
  }, [mode, handleExtractAuto, handleDetectFormAuto]);

  // 手动检测表单
  const handleDetectForm = useCallback(async () => {
    setIsDetecting(true);
    // setStatusMessage('正在检测表单字段...');
    // setStatusType('loading');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取当前标签页');

      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'DETECT_FORM',
        payload: { mode }
      });
      
      if (response.success) {
        setFormFields(response.fields || []);
        // const foundCount = response.fields.filter((f: FormFieldInfo) => f.found).length;
        // setStatusMessage(`检测到 ${foundCount} 个可填充字段`);
        // setStatusType('success');
      } else {
        throw new Error(response.error || '检测失败');
      }
    } catch (error) {
      // const msg = error instanceof Error ? error.message : '检测失败';
      // setStatusMessage(msg);
      // setStatusType('error');
    } finally {
      setIsDetecting(false);
    }
  }, [mode]);

  // 提取页面内容
  const handleExtract = useCallback(async () => {
    setIsExtracting(true);
    // setStatusMessage('正在提取页面内容...');
    // setStatusType('loading');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取当前标签页');

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
      
      if (response.success) {
        setPageContent(response.data);
        // setStatusMessage('提取成功');
        // setStatusType('success');
      } else {
        throw new Error(response.error || '提取失败');
      }
    } catch (error) {
      // const msg = error instanceof Error ? error.message : '提取失败';
      // setStatusMessage(msg);
      // setStatusType('error');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  // 一键生成（一次调用，同时得到原文和中文）
  const handleGenerate = useCallback(async () => {
    // 检查是否登录
    if (!user || !activeSite) {
      alert('请先登录并添加推广网站\n\n点击右上角设置按钮 → 使用 Google 账号登录');
      return;
    }

    // 评论模式需要页面内容，导航站模式不需要
    if (mode === 'comment' && !pageContent) {
      alert('请先提取页面内容');
      return;
    }

    setIsGenerating(true);
    setOriginalComment('');
    setChineseComment('');

    try {
      // 使用 Supabase 中的激活网站
      const projectInfo = {
        targetUrl: activeSite.url,
        keywords: activeSite.keywords || '',
        brandName: activeSite.brand_name || '',
        title: activeSite.title || '',
        tagline: activeSite.tagline || '',
        description: activeSite.description || '',
        email: activeSite.email || '',
        name: activeSite.author_name || '',
      };
      
      if (!projectInfo.targetUrl) {
        alert('推广网站配置不完整，请在设置中检查');
        return;
      }

      // 解析字符限制：优先用户输入，否则用网页提取的（最小20字符）
      const MIN_CHAR_LIMIT = 20;
      const parsedLimit = parseInt(charLimitInput, 10);
      const detectedLimit = formFields.find(f => f.type === 'comment')?.maxLength;
      let charLimit: number | undefined;
      if (mode === 'directory') {
        if (parsedLimit > 0) {
          charLimit = Math.max(parsedLimit, MIN_CHAR_LIMIT);
        } else if (detectedLimit) {
          charLimit = Math.max(detectedLimit, MIN_CHAR_LIMIT);
        }
      }

      // 一次 API 调用，返回两个版本
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_CONTENT',
        payload: { 
          mode, 
          pageContent: mode === 'comment' ? pageContent : null, 
          projectInfo,
          charLimit,
        },
      });

      if (!response.success) throw new Error(response.error || '生成失败');

      const originalText = response.original || '';
      const chineseText = response.chinese || '';
      
      setOriginalComment(originalText);
      setChineseComment(chineseText);
      
      // 保存到 storage，防止刷新丢失
      await chrome.storage.local.set({
        saved_comment_original: originalText,
        saved_comment_chinese: chineseText,
      });
      console.log('[Sidepanel] 评论已保存到 storage:', { originalText: originalText.substring(0, 50), chineseText: chineseText.substring(0, 50) });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '生成失败';
      showToastMessage('生成失败：' + msg, 'error');
      console.error('生成错误:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [mode, pageContent, charLimitInput, formFields, activeSite, user]);

  // 填充表单
  const handleFill = useCallback(async (useChineseVersion: boolean) => {
    // 检查是否登录
    if (!user || !activeSite) {
      alert('请先登录并添加推广网站');
      return;
    }

    const contentToFill = useChineseVersion ? chineseComment : originalComment;

    setIsFilling(true);

    try {
      // 使用 Supabase 中的激活网站
      const projectInfo = {
        targetUrl: activeSite.url,
        email: activeSite.email || '',
        brandName: activeSite.brand_name || '',
        name: activeSite.author_name || '',
        title: activeSite.title || '',
        tagline: activeSite.tagline || '',
      };

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取标签页');

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FORM',
        payload: {
          url: projectInfo.targetUrl || '',
          email: projectInfo.email || '',
          sitename: projectInfo.brandName || '',
          author: projectInfo.name || '',
          title: projectInfo.title || '',
          tagline: projectInfo.tagline || '',
          content: contentToFill,
          mode: mode,
        },
      });

      if (response.success) {
        
        // 自动保存外链记录到 Supabase
        if (user && activeSite && tab.url) {
          try {
            let domain = '';
            try {
              domain = new URL(tab.url).hostname;
            } catch {
              domain = tab.url;
            }
            await createBacklink({
              user_id: user.id,
              site_id: activeSite.id,
              domain: domain,
              backlink_url: tab.url,
              embedded_link: projectInfo.targetUrl,
              mode: mode,
              content: contentToFill,
              status: 'success',
            });
            console.log('✅ 外链记录已自动保存');
          } catch (error) {
            console.error('❌ 保存外链记录失败:', error);
          }
        }
        
        // 显示成功提示
        const successMsg = "填充完成\n\n外链记录已保存!";
        showToastMessage(successMsg, 'success');
      } else {
        showToastMessage('未找到可填充的表单字段', 'error');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '填充失败';
      showToastMessage('填充失败：' + msg, 'error');
      console.error('填充错误:', error);
    } finally {
      setIsFilling(false);
    }
  }, [mode, originalComment, chineseComment, activeSite]);

  // 快速填充：只填充基础字段（URL、邮箱、网站名等），不需要 AI 生成内容
  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  // 定位到表单
  const handleScrollToForm = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取标签页');

      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'SCROLL_TO_FORM',
        payload: { mode }
      });
      
      if (response.success) {
        // setStatusMessage(response.message);
        // setStatusType('success');
      } else {
        // setStatusMessage(response.message || '未找到表单');
        // setStatusType('error');
      }
    } catch (error) {
      // setStatusMessage('定位失败');
      // setStatusType('error');
    }
  }, [mode]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    // setStatusMessage('已复制到剪贴板');
    // setStatusType('success');
  }, []);

  // 高亮单个字段
  const handleHighlightField = useCallback(async (fieldType: string) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'HIGHLIGHT_FIELD',
        payload: { fieldType }
      });
      
      if (response.success) {
        // setStatusMessage(response.message);
        // setStatusType('success');
      }
    } catch (error) {
      // 静默失败
    }
  }, []);

  const isLoading = isExtracting || isGenerating || isFilling;
  
  // 解析字符限制用于显示：优先用户输入，否则用网页提取的（最小20字符）
  const MIN_CHAR_LIMIT = 20;
  const parsedLimit = parseInt(charLimitInput, 10);
  const detectedLimit = formFields.find(f => f.type === 'comment')?.maxLength;
  let charLimit: number | undefined;
  if (mode === 'directory') {
    if (parsedLimit > 0) {
      charLimit = Math.max(parsedLimit, MIN_CHAR_LIMIT);
    } else if (detectedLimit) {
      charLimit = Math.max(detectedLimit, MIN_CHAR_LIMIT);
    }
  }

  return (
    <div className="sidepanel-container">
      {/* 头部 */}
      <header className="header">
        <div className="header-left">
          <div style={{ fontSize: '18px' }}>🔗</div>
          <h1 className="header-title">BacklinkAI</h1>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleOpenSettings}>⚙️</button>
        </div>
      </header>

      <div className="main-content">
        {/* 未登录提示 */}
        {!user && (
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
              ⚠️ 请先登录
            </div>
            <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '8px' }}>
              生成评论和填充表单需要先登录并添加推广网站
            </div>
            <button
              onClick={handleOpenSettings}
              style={{
                padding: '6px 12px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              前往登录 →
            </button>
          </div>
        )}

        {/* 推广项目选择器 */}
        {user && sites.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '6px', fontWeight: '500' }}>
              当前推广项目
            </div>
            <select
              value={activeSite?.id || ''}
              onChange={(e) => {
                const selected = sites.find(s => s.id === e.target.value);
                setActiveSite(selected || null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                fontSize: '13px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.is_active ? '● ' : ''}{site.name} ({(() => {
                    try {
                      return new URL(site.url).hostname;
                    } catch {
                      return site.url;
                    }
                  })()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 已登录但没有推广网站的提示 */}
        {user && sites.length === 0 && (
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
              📝 还没有推广网站
            </div>
            <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '8px' }}>
              请先添加一个推广网站才能使用生成功能
            </div>
            <button
              onClick={handleOpenSettings}
              style={{
                padding: '6px 12px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              添加推广网站 →
            </button>
          </div>
        )}

        {/* 模式选择 */}
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'comment' ? 'active' : ''}`}
            onClick={() => setMode('comment')}
            disabled={isLoading}
          >
            💬 评论
          </button>
          <button
            className={`mode-tab ${mode === 'directory' ? 'active' : ''}`}
            onClick={() => setMode('directory')}
            disabled={isLoading}
          >
            📁 导航站
          </button>
        </div>

        {/* 评论模式：左右布局 */}
        {mode === 'comment' && (
          <div className="comment-layout">
            {/* 左侧：页面内容 */}
            <div className="card page-content-card">
              <div className="card-header">
                <span className="card-title">页面正文</span>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting ? '提取中...' : '提取'}
                </button>
              </div>
              <div className="card-body">
                {pageContent ? (
                  <div className="extracted-content">
                    <div className="extracted-item">
                      <span className="extracted-label">## title:</span>
                      <span className="extracted-value">{pageContent.title}</span>
                    </div>
                    <div className="extracted-item">
                      <span className="extracted-label">## content:</span>
                      <span className="extracted-value">{pageContent.bodyText}</span>
                    </div>
                    <div className="char-count">{pageContent.bodyText.length}/2000</div>
                  </div>
                ) : (
                  <div className="empty-hint">自动提取页面内容中...</div>
                )}
              </div>
            </div>

            {/* 右侧：表单字段 */}
            <div className="card page-content-card">
              <div className="card-header">
                <span className="card-title">表单字段</span>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleDetectForm}
                  disabled={isDetecting}
                >
                  {isDetecting ? '检测中...' : '检测'}
                </button>
              </div>
              <div className="card-body">
                {formFields.length > 0 ? (
                  <div className="field-tags-container">
                    {formFields.map((field, index) => (
                      <div
                        key={index}
                        className={`field-tag ${field.found ? 'found' : 'not-found'} ${field.found ? 'clickable' : ''}`}
                        onClick={() => field.found && handleHighlightField(field.type)}
                        title={field.found ? `点击定位 | 得分: ${field.score}` : '未匹配'}
                      >
                        <span className="field-tag-icon">
                          {field.found ? '✓' : '✗'}
                        </span>
                        <span className="field-tag-name">{field.name}</span>
                        {field.found && field.score && (
                          <span className="field-tag-score">{field.score}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-hint">自动检测表单字段中...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 导航站模式：表单字段检测区 */}
        {mode === 'directory' && (
          <div className="card page-content-card">
            <div className="card-header">
              <span className="card-title">表单字段</span>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleDetectForm}
                disabled={isDetecting}
              >
                {isDetecting ? '检测中...' : '检测'}
              </button>
            </div>
            <div className="card-body">
              {formFields.length > 0 ? (
                <div className="field-tags-container">
                  {formFields.map((field, index) => (
                    <div 
                      key={index} 
                      className={`field-tag ${field.found ? 'found' : 'not-found'} ${field.found ? 'clickable' : ''}`}
                      onClick={() => field.found && handleHighlightField(field.type)}
                      title={field.found ? `点击定位 | 得分: ${field.score}` : '未匹配'}
                    >
                      <span className="field-tag-icon">
                        {field.found ? '✓' : '✗'}
                      </span>
                      <span className="field-tag-name">{field.name}</span>
                      {field.found && field.score && (
                        <span className="field-tag-score">{field.score}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-hint">自动检测表单字段中...</div>
              )}
            </div>
          </div>
        )}

        {/* ========== 评论模式的独立区域 ========== */}
        {mode === 'comment' && (
          <>

            {/* 评论区容器 */}
            <div className="comments-container">
              {/* 原评论框 */}
              <div className="card flex-grow">
                <div className="card-header">
                  <span className="card-title">原评论</span>
                  <span className="card-badge">
                    {originalComment.length} 字符
                  </span>
                </div>
                <div className="card-body content-body-with-copy">
                  <textarea
                    className="content-textarea"
                    value={originalComment}
                    onChange={(e) => setOriginalComment(e.target.value)}
                    placeholder="生成后显示原文评论，点击可编辑"
                  />
                  <button
                    className="copy-icon-btn-inner"
                    onClick={() => handleCopy(originalComment)}
                    title="复制"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* 中文评论框 */}
              <div className="card flex-grow">
                <div className="card-header">
                  <span className="card-title">中文评论</span>
                  <span className="card-badge">
                    {chineseComment.length} 字符
                  </span>
                </div>
                <div className="card-body content-body-with-copy">
                  <textarea
                    className="content-textarea"
                    value={chineseComment}
                    onChange={(e) => setChineseComment(e.target.value)}
                    placeholder="生成后显示中文版本，点击可编辑"
                  />
                  <button
                    className="copy-icon-btn-inner"
                    onClick={() => handleCopy(chineseComment)}
                    title="复制"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isLoading || !pageContent || !user || !activeSite}
                style={{ flex: 1 }}
                title={!user || !activeSite ? '请先登录并添加推广网站' : ''}
              >
                {isGenerating ? (
                  <><div className="spinner" /> 生成中...</>
                ) : (
                  <>🚀 生成评论</>
                )}
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleFill(false)}
                disabled={isFilling || !user || !activeSite}
                style={{ flex: 1 }}
                title={!user || !activeSite ? '请先登录并添加推广网站' : '自动填充表单（使用原评论）'}
              >
                {isFilling ? '填充中...' : '📝 自动填充'}
              </button>
            </div>
            
            {/* 表单统计 */}
            {formFields.length > 0 && (
              <div 
                className="form-stats-link"
                onClick={handleScrollToForm}
              >
                已识别到 {formFields.filter(f => f.found).length} 个表单
              </div>
            )}
          </>
        )}

        {/* ========== 导航站模式的独立区域 ========== */}
        {mode === 'directory' && (
          <>

            {/* 描述区容器 */}
            <div className="comments-container">
              {/* 原描述框 */}
              <div className="card flex-grow">
                <div className="card-header">
                  <span className="card-title">网站描述</span>
                  <span className={`card-badge ${charLimit && originalComment.length > charLimit ? 'over-limit' : ''}`}>
                    {originalComment.length}{charLimit ? `/${charLimit}` : ''} 字符
                  </span>
                </div>
                <div className="card-body content-body-with-copy">
                  <textarea
                    className="content-textarea"
                    value={originalComment}
                    onChange={(e) => setOriginalComment(e.target.value)}
                    placeholder="生成后显示网站描述，点击可编辑"
                  />
                  <button
                    className="copy-icon-btn-inner"
                    onClick={() => handleCopy(originalComment)}
                    title="复制"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* 中文描述框 */}
              <div className="card flex-grow">
                <div className="card-header">
                  <span className="card-title">中文描述</span>
                  <span className={`card-badge ${charLimit && chineseComment.length > charLimit ? 'over-limit' : ''}`}>
                    {chineseComment.length}{charLimit ? `/${charLimit}` : ''} 字符
                  </span>
                </div>
                <div className="card-body content-body-with-copy">
                  <textarea
                    className="content-textarea"
                    value={chineseComment}
                    onChange={(e) => setChineseComment(e.target.value)}
                    placeholder="生成后显示中文版本，点击可编辑"
                  />
                  <button
                    className="copy-icon-btn-inner"
                    onClick={() => handleCopy(chineseComment)}
                    title="复制"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* 字符限制输入 */}
            <div className="char-limit-input">
              <label>生成字符限制(可选)：</label>
              <input
                type="number"
                value={charLimitInput}
                onChange={(e) => setCharLimitInput(e.target.value)}
                disabled={isLoading}
                min="1"
                max="10000"
              />
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isLoading || !user || !activeSite}
                style={{ flex: 1 }}
                title={!user || !activeSite ? '请先登录并添加推广网站' : ''}
              >
                {isGenerating ? (
                  <><div className="spinner" /> 生成中...</>
                ) : (
                  <>🚀 生成描述</>
                )}
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleFill(false)}
                disabled={isFilling || !user || !activeSite}
                style={{ flex: 1 }}
                title={!user || !activeSite ? '请先登录并添加推广网站' : '自动填充表单（使用网站描述）'}
              >
                {isFilling ? '填充中...' : '📝 自动填充'}
              </button>
            </div>
            
            {/* 表单统计 */}
            {formFields.length > 0 && (
              <div 
                className="form-stats-link"
                onClick={handleScrollToForm}
              >
                已识别到 {formFields.filter(f => f.found).length} 个表单
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
          fontSize: '13px',
          fontWeight: '500',
          zIndex: 10000,
          maxWidth: '90%',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          border: `2px solid ${toastType === 'success' ? '#10b981' : toastType === 'error' ? '#ef4444' : '#3b82f6'}`,
          textAlign: 'center',
        }}>
          <span style={{ color: '#1f2937', whiteSpace: 'pre-line' }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
