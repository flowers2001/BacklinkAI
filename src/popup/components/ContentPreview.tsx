import { useState } from 'react';

interface ContentPreviewProps {
  content: string;
  onChange: (content: string) => void;
  onCopy: () => void;
}

export function ContentPreview({ content, onChange, onCopy }: ContentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  if (!content) {
    return null;
  }
  
  return (
    <div className="content-preview">
      <div className="content-preview-header">
        <span className="content-preview-title">生成内容</span>
        <div className="content-preview-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setIsEditing(!isEditing)}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            {isEditing ? '完成' : '编辑'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCopy}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            复制
          </button>
        </div>
      </div>
      
      {isEditing ? (
        <textarea
          className="form-input form-textarea"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: '8px' }}
        />
      ) : (
        <div className="content-preview-text">{content}</div>
      )}
    </div>
  );
}
