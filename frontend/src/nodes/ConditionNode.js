import React from 'react';
import { Handle } from 'reactflow';

const ConditionNode = ({ id, data, selected, isConnectable }) => {
  const handleChange = (field, value) => {
    if (data?.onChange) {
      data.onChange(id, { [field]: value });
    }
  };

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className={`condition-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span>Condition</span>
        <button 
          className="node-delete-btn"
          onClick={handleDelete}
        >
          ×
        </button>
      </div>
      
      <div className="node-content">
        <input
          type="text"
          value={data?.condition || ''}
          onChange={(e) => handleChange('condition', e.target.value)}
          placeholder="Condition (e.g. user.age > 18)"
          className="node-input"
        />
        
        <div className="condition-labels">
          <input
            type="text"
            value={data?.trueLabel || 'Yes'}
            onChange={(e) => handleChange('trueLabel', e.target.value)}
            className="node-input small"
          />
          <input
            type="text"
            value={data?.falseLabel || 'No'}
            onChange={(e) => handleChange('falseLabel', e.target.value)}
            className="node-input small"
          />
        </div>
      </div>
      
      <Handle
        type="target"
        position="left"
        id={`${id}-target`}
        isConnectable={isConnectable}
        className="node-handle"
      />
      
      <Handle
        type="source"
        position="right"
        id={`${id}-true`}
        isConnectable={isConnectable}
        className="node-handle true-handle"
        style={{ top: '30%' }}
      >
        <div className="handle-label">{data?.trueLabel || 'Yes'}</div>
      </Handle>
      
      <Handle
        type="source"
        position="right"
        id={`${id}-false`}
        isConnectable={isConnectable}
        className="node-handle false-handle"
        style={{ top: '70%' }}
      >
        <div className="handle-label">{data?.falseLabel || 'No'}</div>
      </Handle>
    </div>
  );
};

export default ConditionNode;