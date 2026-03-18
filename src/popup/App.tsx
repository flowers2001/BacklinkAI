import { useState, useCallback } from 'react';
import type { WorkMode } from '../shared/types';
import { ModeSelector } from './components/ModeSelector';
import { StatusIndicator } from './components/StatusIndicator';
import { ContentPreview } from './components/ContentPreview';
import { GenerateButton } from './components/GenerateButton';
import { useAIGenerate } from './hooks/useAIGenerate';

function App() {
  const [mode, setMode] = useState<WorkMode>('comment');
  const { status, message, content, setContent, generate, fill } = useAIGenerate();
  
  const isLoading = status === 'scraping' || status === 'generating' || status === 'filling';
  
  const handleGenerate = useCallback(() => {
    generate(mode);
  }, [generate, mode]);
  
  const handleCopy = useCallback(async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
    }
  }, [content]);
  
  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  return (
    <div className="popup-container">
      {/* 头部 */}
      <header className="header">
        <img src="/icons/icon48.svg" alt="Logo" className="header-icon" />
        <h1 className="header-title">AI 外链助手</h1>
        <button
          className="btn btn-secondary"
          onClick={handleOpenSettings}
          style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}
          title="设置"
        >
          设置
        </button>
      </header>
      
      {/* 模式选择 */}
      <ModeSelector
        mode={mode}
        onChange={setMode}
        disabled={isLoading}
      />
      
      {/* 状态指示器 */}
      <StatusIndicator status={status} message={message} />
      
      {/* 内容预览 */}
      <ContentPreview
        content={content}
        onChange={setContent}
        onCopy={handleCopy}
      />
      
      {/* 操作按钮 */}
      <GenerateButton
        status={status}
        hasContent={!!content}
        onGenerate={handleGenerate}
        onFill={fill}
      />
      
      {/* 底部提示 */}
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
        {mode === 'comment' ? (
          <span>将根据当前页面内容生成评论</span>
        ) : (
          <span>将生成适合导航站提交的网站描述</span>
        )}
      </div>
    </div>
  );
}

export default App;
