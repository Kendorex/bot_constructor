import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

const TimerNode = ({ id, data }) => {
  const { delay, targetNode, onChange, onDelete } = data;

  const handleChange = (field, value) => {
    onChange(id, { [field]: value });
  };

  return (
    <div className="node timer-node" style={{
      padding: '15px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      minWidth: '250px'
    }}>
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: '#333' }}>Timer</h4>
        <button 
          className="node-delete" 
          onClick={() => onDelete(id)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#999'
          }}
        >
          ×
        </button>
      </div>
      
      <div className="node-content" style={{ fontSize: '13px' }}>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Delay (seconds):</label>
          <input
            type="number"
            value={delay}
            onChange={(e) => handleChange('delay', parseInt(e.target.value) || 0)}
            min="1"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Target Node ID:</label>
          <input
            type="text"
            value={targetNode}
            onChange={(e) => handleChange('targetNode', e.target.value)}
            placeholder="Enter target node ID"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default TimerNode;