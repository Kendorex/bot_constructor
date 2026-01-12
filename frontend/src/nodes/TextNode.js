import React from 'react';
import { Handle, Position } from 'reactflow';

const TextNode = ({ id, data, selected }) => {
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
    <div style={{
      padding: '15px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      minWidth: '250px'
    }}>
      <Handle type="target" position={Position.Left} />
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: '#333' }}>Text Message</h4>
        <button 
          onClick={handleDelete}
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
      
      <div style={{ fontSize: '13px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Message:</label>
          <textarea
            value={data.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Enter message text"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '60px',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Send Timing:</label>
          <select
            value={data.delay || '0'}
            onChange={(e) => handleChange('delay', e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          >
            <option value="0">Send immediately</option>
            <option value="300">After 5 minutes</option>
            <option value="900">After 15 minutes</option>
            <option value="1800">After 30 minutes</option>
            <option value="3600">After 1 hour</option>
            <option value="86400">After 1 day</option>
            <option value="custom">Custom delay</option>
          </select>
          
          {data.delay === 'custom' && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="number"
                value={data.customDelay || ''}
                onChange={(e) => handleChange('customDelay', e.target.value)}
                placeholder="Delay in seconds"
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default React.memo(TextNode);