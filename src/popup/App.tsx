import { useState, useCallback, useEffect } from 'react';
import type { WorkMode } from '../shared/types';
import { useAIGenerate } from './hooks/useAIGenerate';

function App() {
  const [mode, setMode] = useState<WorkMode>('comment');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [pageInfo, setPageInfo] = useState<{ title: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { status, message, content, setContent, generate, fill } = useAIGenerate();
  
  const isLoading = status === 'scraping' || status === 'generating' || status === 'filling';

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setPageInfo({
          title: tabs[0].title || '未知页面',
          url: tabs[0].url || '',
        });
      }
    });
  }, []);

  useEffect(() => {
    setEditContent(content);
  }, [content]);
  
  const handleGenerate = useCallback(() => {
    generate(mode);
  }, [generate, mode]);
  
  const handleCopy = useCallback(async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);
  
  const handleSaveEdit = useCallback(() => {
    setContent(editContent);
    setIsEditing(false);
  }, [editContent, setContent]);
  
  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  const getStatusClass = () => {
    if (isLoading) return 'loading';
    if (status === 'success') return 'success';
    if (status === 'error') return 'error';
    return 'idle';
  };

  return (
    <div className="popup-container">
      {/* 头部 */}
      <header className="header">
        <div className="header-left">
          <img src="/icons/icon48.svg" alt="Logo" className="header-icon" />
          <h1 className="header-title">AI 外链助手</h1>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleOpenSettings}>
            设置
          </button>
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
            <span className="mode-tab-icon">💬</span>
            评论模式
          </button>
          <button
            className={`mode-tab ${mode === 'directory' ? 'active' : ''}`}
            onClick={() => setMode('directory')}
            disabled={isLoading}
          >
            <span className="mode-tab-icon">📁</span>
            导航站模式
          </button>
        </div>

        {/* 当前页面信息 */}
        {pageInfo && (
          <div className="page-preview">
            <div className="page-preview-label">当前页面</div>
            <div className="page-preview-title">{pageInfo.title}</div>
            <div className="page-preview-url">{pageInfo.url}</div>
          </div>
        )}
        
        {/* 状态指示器 */}
        <div className={`status-bar ${getStatusClass()}`}>
          {isLoading && <div className="spinner" />}
          <span>{message}</span>
        </div>
        
        {/* 生成内容区域 */}
        {content && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {mode === 'comment' ? '生成的评论' : '生成的描述'}
              </span>
              <span className="card-badge">{content.length} 字</span>
            </div>
            <div className="card-body">
              {isEditing ? (
                <>
                  <textarea
                    className="content-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                      保存
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="content-box">
                    <div className="content-box-text">{content}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                      编辑
                    </button>
                    <button 
                      className={`btn btn-secondary btn-sm ${copied ? 'copy-success' : ''}`} 
                      onClick={handleCopy}
                    >
                      {copied ? '已复制 ✓' : '复制'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 空状态提示 */}
        {!content && !isLoading && status === 'idle' && (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <div className="empty-state-text">
              点击下方按钮开始生成{mode === 'comment' ? '评论' : '站点描述'}
            </div>
          </div>
        )}
      </div>
      
      {/* 底部操作栏 */}
      <div className="action-bar">
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isLoading}
          style={{ flex: 2 }}
        >
          {isLoading && status !== 'filling' ? (
            <>
              <div className="spinner" />
              {status === 'scraping' ? '抓取中...' : '生成中...'}
            </>
          ) : (
            <>🚀 一键生成</>
          )}
        </button>
        
        {content && (
          <button
            className="btn btn-success"
            onClick={fill}
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {status === 'filling' ? (
              <>
                <div className="spinner" />
                填充中
              </>
            ) : (
              <>📝 填充</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
