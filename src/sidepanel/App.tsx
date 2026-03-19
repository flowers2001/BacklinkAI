import { useState, useCallback, useEffect } from 'react';
import type { WorkMode, ScrapedContent } from '../shared/types';

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
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [editingOriginal, setEditingOriginal] = useState(false);
  const [editingChinese, setEditingChinese] = useState(false);

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
      setStatusMessage('');
      setStatusType('idle');
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
    setStatusMessage('正在检测表单字段...');
    setStatusType('loading');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取当前标签页');

      const response = await chrome.tabs.sendMessage(tab.id, { 
        type: 'DETECT_FORM',
        payload: { mode }
      });
      
      if (response.success) {
        setFormFields(response.fields || []);
        const foundCount = response.fields.filter((f: FormFieldInfo) => f.found).length;
        setStatusMessage(`检测到 ${foundCount} 个可填充字段`);
        setStatusType('success');
      } else {
        throw new Error(response.error || '检测失败');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '检测失败';
      setStatusMessage(msg);
      setStatusType('error');
    } finally {
      setIsDetecting(false);
    }
  }, [mode]);

  // 提取页面内容
  const handleExtract = useCallback(async () => {
    setIsExtracting(true);
    setStatusMessage('正在提取页面内容...');
    setStatusType('loading');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取当前标签页');

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
      
      if (response.success) {
        setPageContent(response.data);
        setStatusMessage('提取成功');
        setStatusType('success');
      } else {
        throw new Error(response.error || '提取失败');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '提取失败';
      setStatusMessage(msg);
      setStatusType('error');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  // 一键生成（一次调用，同时得到原文和中文）
  const handleGenerate = useCallback(async () => {
    // 评论模式需要页面内容，导航站模式不需要
    if (mode === 'comment' && !pageContent) {
      setStatusMessage('请先提取页面内容');
      setStatusType('error');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('正在生成内容...');
    setStatusType('loading');
    setOriginalComment('');
    setChineseComment('');

    try {
      const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (!configResponse.success) throw new Error('无法获取配置');

      const projectInfo = configResponse.data.project;
      if (!projectInfo.targetUrl) throw new Error('请先在设置中配置推广网址');

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
      setStatusMessage('生成完成！');
      setStatusType('success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '生成失败';
      setStatusMessage(msg);
      setStatusType('error');
    } finally {
      setIsGenerating(false);
    }
  }, [mode, pageContent, charLimitInput, formFields]);

  // 填充表单
  const handleFill = useCallback(async (useChineseVersion: boolean) => {
    const contentToFill = useChineseVersion ? chineseComment : originalComment;
    if (!contentToFill) {
      setStatusMessage('没有可填充的内容');
      setStatusType('error');
      return;
    }

    setIsFilling(true);
    setStatusMessage('正在填充表单...');
    setStatusType('loading');

    try {
      const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      const projectInfo = configResponse.data?.project || {};

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取标签页');

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FORM',
        payload: {
          url: projectInfo.targetUrl || '',
          email: projectInfo.email || '',
          sitename: projectInfo.brandName || '',      // 网站名/品牌名
          author: projectInfo.name || '',              // 联系人/作者
          title: projectInfo.brandName || '',          // 标题
          tagline: projectInfo.tagline || '',          // 标语/简短描述
          content: contentToFill,
        },
      });

      if (response.success) {
        const filled = response.filledFields.length;
        const missed = response.missingFields.length;
        setStatusMessage(`填充完成！已填充 ${filled} 个字段${missed > 0 ? `，${missed} 个未找到` : ''}`);
        setStatusType('success');
      } else {
        setStatusMessage('未找到可填充的表单字段');
        setStatusType('error');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '填充失败';
      setStatusMessage(msg);
      setStatusType('error');
    } finally {
      setIsFilling(false);
    }
  }, [mode, originalComment, chineseComment]);

  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  // 定位到表单
  const handleScrollToForm = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('无法获取标签页');

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_TO_FORM' });
      
      if (response.success) {
        setStatusMessage(response.message);
        setStatusType('success');
      } else {
        setStatusMessage(response.message || '未找到表单');
        setStatusType('error');
      }
    } catch (error) {
      setStatusMessage('定位失败');
      setStatusType('error');
    }
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setStatusMessage('已复制到剪贴板');
    setStatusType('success');
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
        setStatusMessage(response.message);
        setStatusType('success');
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
                  <div className="extracted-content">
                    {formFields.map((field, index) => (
                      <div 
                        key={index} 
                        className={`form-field-item ${field.found ? 'clickable' : ''}`}
                        onClick={() => field.found && handleHighlightField(field.type)}
                        title={field.found ? '点击定位到该字段' : ''}
                      >
                        <span className={`field-status ${field.found ? 'found' : 'not-found'}`}>
                          {field.found ? '✓' : '✗'}
                        </span>
                        <span className="field-name">
                          {field.name}
                          {field.required && <span className="field-required">*</span>}
                        </span>
                        {field.found && field.score && (
                          <span className="field-score">{field.score}分</span>
                        )}
                        {field.maxLength && (
                          <span className="field-limit">≤{field.maxLength}字</span>
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
                <div className="extracted-content">
                  {formFields.map((field, index) => (
                    <div 
                      key={index} 
                      className={`form-field-item ${field.found ? 'clickable' : ''}`}
                      onClick={() => field.found && handleHighlightField(field.type)}
                      title={field.found ? '点击定位到该字段' : ''}
                    >
                      <span className={`field-status ${field.found ? 'found' : 'not-found'}`}>
                        {field.found ? '✓' : '✗'}
                      </span>
                      <span className="field-name">
                        {field.name}
                        {field.required && <span className="field-required">*</span>}
                      </span>
                      {field.found && field.score && (
                        <span className="field-score">{field.score}分</span>
                      )}
                      {field.maxLength && (
                        <span className="field-limit">≤{field.maxLength}字</span>
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

        {/* 导航站模式：字符限制输入 */}
        {mode === 'directory' && (
          <div className="char-limit-input">
            <label>字符限制：</label>
            <input
              type="number"
              placeholder="留空不限制"
              value={charLimitInput}
              onChange={(e) => setCharLimitInput(e.target.value)}
              disabled={isLoading}
              min="1"
              max="10000"
            />
            <span className="input-hint">英文含空格</span>
          </div>
        )}

        {/* 状态提示 */}
        {statusMessage && (
          <div className={`status-bar ${statusType}`}>
            {isLoading && <div className="spinner" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={isLoading || (mode === 'comment' && !pageContent)}
            style={{ flex: 2 }}
          >
            {isGenerating ? (
              <><div className="spinner" /> 生成中...</>
            ) : (
              <>🚀 一键生成</>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleScrollToForm}
            disabled={isLoading}
            style={{ flex: 1 }}
            title="定位到页面表单位置"
          >
            📍 定位表单
          </button>
        </div>

        {/* 评论区容器 */}
        <div className="comments-container">
          {/* 原评论框 */}
          <div className="card flex-grow">
            <div className="card-header">
              <span className="card-title">原评论</span>
              {originalComment && (
                <span className={`card-badge ${charLimit && originalComment.length > charLimit ? 'over-limit' : ''}`}>
                  {originalComment.length}{charLimit ? `/${charLimit}` : ''} 字符
                </span>
              )}
            </div>
            <div className="card-body">
              {editingOriginal ? (
                <textarea
                  className="content-textarea"
                  value={originalComment}
                  onChange={(e) => setOriginalComment(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="content-box">
                  {originalComment ? (
                    <div className="content-box-text">{originalComment}</div>
                  ) : (
                    <div className="content-box-placeholder">生成后显示原文评论</div>
                  )}
                </div>
              )}
              {originalComment && (
                <div className="content-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingOriginal(!editingOriginal)}
                  >
                    ✏️ {editingOriginal ? '完成' : '编辑'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopy(originalComment)}
                  >
                    📋 复制
                  </button>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleFill(false)}
                    disabled={isFilling}
                  >
                    📝 填充
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 中文评论框 */}
          <div className="card flex-grow">
            <div className="card-header">
              <span className="card-title">中文评论</span>
              {chineseComment && (
                <span className={`card-badge ${charLimit && chineseComment.length > charLimit ? 'over-limit' : ''}`}>
                  {chineseComment.length}{charLimit ? `/${charLimit}` : ''} 字符
                </span>
              )}
            </div>
            <div className="card-body">
              {editingChinese ? (
                <textarea
                  className="content-textarea"
                  value={chineseComment}
                  onChange={(e) => setChineseComment(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="content-box">
                  {chineseComment ? (
                    <div className="content-box-text">{chineseComment}</div>
                  ) : (
                    <div className="content-box-placeholder">生成后显示中文版本</div>
                  )}
                </div>
              )}
              {chineseComment && (
                <div className="content-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingChinese(!editingChinese)}
                  >
                    ✏️ {editingChinese ? '完成' : '编辑'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopy(chineseComment)}
                  >
                    📋 复制
                  </button>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleFill(true)}
                    disabled={isFilling}
                  >
                    📝 填充
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
