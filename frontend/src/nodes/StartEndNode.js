import React from 'react';
import { Handle, Position } from 'reactflow';

const StartEndNode = ({ id, data, selected, isConnectable }) => {
  const handleChange = (e) => {
    if (data.onChange) {
      data.onChange(id, { command: e.target.value });
    }
  };

  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const nodeType = data.isStart ? 'Start' : 'End';
  const nodeColor = data.isStart ? '#4caf50' : '#ff6b6b';

  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      border: `2px solid ${nodeColor}`,
      boxShadow: selected ? '0 0 0 2px rgba(76, 175, 80, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '120px',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${nodeColor}20` // 20 = 12% opacity
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: nodeColor
        }}>
          {nodeType}
        </span>
        <button 
          onClick={handleDelete}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#999',
            fontWeight: 'bold',
            padding: '0 4px'
          }}
        >
          ×
        </button>
      </div>
      
      {data.isStart && (
        <div style={{ marginTop: '8px' }}>
          <select
            value={data.command || ''}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              border: `2px solid ${nodeColor}40`,
              backgroundColor: '#fafafa',
              fontSize: '12px',
              color: '#333'
            }}
          >
            {data.commands?.map(cmd => (
              <option key={cmd} value={cmd}>{cmd}</option>
            ))}
          </select>
        </div>
      )}
      
      {data.isStart ? (
        <Handle
          type="source"
          position={Position.Right}
          id={`${id}-source`}
          isConnectable={isConnectable}
          style={{
            width: '14px',
            height: '14px',
            backgroundColor: nodeColor,
            border: '2px solid white',
            boxShadow: '0 0 2px rgba(0,0,0,0.2)'
          }}
        />
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          id={`${id}-target`}
          isConnectable={isConnectable}
          style={{
            width: '14px',
            height: '14px',
            backgroundColor: nodeColor,
            border: '2px solid white',
            boxShadow: '0 0 2px rgba(0,0,0,0.2)'
          }}
        />
      )}
    </div>
  );
};

export default React.memo(StartEndNode);