import type { AppStatus } from '../../shared/types';

interface GenerateButtonProps {
  status: AppStatus;
  hasContent: boolean;
  onGenerate: () => void;
  onFill: () => void;
}

export function GenerateButton({ status, hasContent, onGenerate, onFill }: GenerateButtonProps) {
  const isLoading = status === 'scraping' || status === 'generating' || status === 'filling';
  
  return (
    <div className="action-bar">
      <button
        className="btn btn-primary"
        onClick={onGenerate}
        disabled={isLoading}
        style={{ flex: 2 }}
      >
        {isLoading && status !== 'filling' ? (
          <>
            <div className="spinner" />
            {status === 'scraping' ? '抓取中...' : '生成中...'}
          </>
        ) : (
          '一键处理'
        )}
      </button>
      
      {hasContent && (
        <button
          className="btn btn-success"
          onClick={onFill}
          disabled={isLoading}
          style={{ flex: 1 }}
        >
          {status === 'filling' ? (
            <>
              <div className="spinner" />
              填充中...
            </>
          ) : (
            '填充表单'
          )}
        </button>
      )}
    </div>
  );
}
