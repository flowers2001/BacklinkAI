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
  // const [statusMessage, setStatusMessage] = useState('');
  // const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Supabase 相关状态
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<PromotionSite[]>([]);
  const [activeSite, setActiveSite] = useState<PromotionSite | null>(null);

  // 加载用户和推广网站
  useEffect(() => {
    loadUserAndSites();
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
      }
    } catch (error) {
      console.error('❌ 加载用户数据失败:', error);
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
      setOriginalComment('');
      setChineseComment('');
      // setStatusMessage('');
      // setStatusType('idle');
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
    // 评论模式需要页面内容，导航站模式不需要
    if (mode === 'comment' && !pageContent) {
      alert('请先提取页面内容');
      return;
    }

    setIsGenerating(true);
    setOriginalComment('');
    setChineseComment('');

    try {
      // 优先使用 Supabase 中的激活网站，否则用本地配置
      let projectInfo: any;
      
      if (activeSite) {
        // 使用 Supabase 数据
        projectInfo = {
          targetUrl: activeSite.url,
          keywords: activeSite.keywords || '',
          brandName: activeSite.brand_name || '',
          title: activeSite.title || '',
          tagline: activeSite.tagline || '',
          description: activeSite.description || '',
          email: activeSite.email || '',
          name: activeSite.author_name || '',
        };
      } else {
        // 使用本地配置（兼容未登录场景）
        const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
        if (!configResponse.success) throw new Error('无法获取配置');
        projectInfo = configResponse.data.project;
      }
      
      if (!projectInfo.targetUrl) {
        alert('请先在设置中配置推广网址');
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

      setOriginalComment(response.original || '');
      setChineseComment(response.chinese || '');
      // setStatusMessage('生成完成！');
      // setStatusType('success');
    } catch (error) {
      // const msg = error instanceof Error ? error.message : '生成失败';
      // setStatusMessage(msg);
      // setStatusType('error');
    } finally {
      setIsGenerating(false);
    }
  }, [mode, pageContent, charLimitInput, formFields, activeSite]);

  // 填充表单
  const handleFill = useCallback(async (useChineseVersion: boolean) => {
    const contentToFill = useChineseVersion ? chineseComment : originalComment;

    setIsFilling(true);

    try {
      // 优先使用 Supabase 中的激活网站，否则用本地配置
      let projectInfo: any;
      
      if (activeSite) {
        projectInfo = {
          targetUrl: activeSite.url,
          email: activeSite.email || '',
          brandName: activeSite.brand_name || '',
          name: activeSite.author_name || '',
          title: activeSite.title || '',
          tagline: activeSite.tagline || '',
        };
      } else {
        const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
        projectInfo = configResponse.data?.project || {};
      }

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
        // const filled = response.filledFields.length;
        // const missed = response.missingFields.length;
        // setStatusMessage(`填充完成！已填充 ${filled} 个字段${missed > 0 ? `，${missed} 个未找到` : ''}`);
        // setStatusType('success');
        
        // 自动保存外链记录到 Supabase
        if (user && activeSite && tab.url) {
          try {
            const domain = new URL(tab.url).hostname;
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
            // 不影响主流程，静默失败
          }
        }
      } else {
        // setStatusMessage('未找到可填充的表单字段');
        // setStatusType('error');
      }
    } catch (error) {
      // const msg = error instanceof Error ? error.message : '填充失败';
      // setStatusMessage(msg);
      // setStatusType('error');
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
          <img src="/icons/icon48.svg" alt="Logo" className="header-icon" />
          <h1 className="header-title">AI 外链助手</h1>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleOpenSettings}>⚙️</button>
        </div>
      </header>

      <div className="main-content">
        {/* 推广项目选择器 */}
        {user && sites.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderBottom: '1px solid #bfdbfe',
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
                  {site.is_active ? '● ' : ''}{site.name} ({new URL(site.url).hostname})
                </option>
              ))}
            </select>
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
                disabled={isLoading || !pageContent}
                style={{ flex: 1 }}
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
                disabled={isFilling}
                style={{ flex: 1 }}
                title="自动填充表单（使用原评论）"
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
                disabled={isLoading}
                style={{ flex: 1 }}
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
                disabled={isFilling}
                style={{ flex: 1 }}
                title="自动填充表单（使用网站描述）"
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
    </div>
  );
}

export default App;
