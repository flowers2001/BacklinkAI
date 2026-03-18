import type { WorkMode } from '../../shared/types';

interface ModeSelectorProps {
  mode: WorkMode;
  onChange: (mode: WorkMode) => void;
  disabled?: boolean;
}

export function ModeSelector({ mode, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <button
        className={`mode-btn ${mode === 'comment' ? 'active' : ''}`}
        onClick={() => onChange('comment')}
        disabled={disabled}
      >
        <div className="mode-btn-title">评论模式</div>
        <div className="mode-btn-desc">博客/论坛评论</div>
      </button>
      <button
        className={`mode-btn ${mode === 'directory' ? 'active' : ''}`}
        onClick={() => onChange('directory')}
        disabled={disabled}
      >
        <div className="mode-btn-title">导航站模式</div>
        <div className="mode-btn-desc">站点提交</div>
      </button>
    </div>
  );
}
