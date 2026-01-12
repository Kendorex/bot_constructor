import React from 'react';
import { Handle, Position } from 'reactflow';

const ButtonNode = ({ id, data, selected }) => {
  const handleChange = (field, value) => {
    if (data?.onChange) {
      data.onChange(id, { [field]: value });
    }
  };

  const handleButtonChange = (index, field, value) => {
    const newButtons = [...(data.buttons || [])];
    newButtons[index] = { ...newButtons[index], [field]: value };
    handleChange('buttons', newButtons);
  };

  const addButton = () => {
    const newButtons = [...(data.buttons || []), { text: 'New Button', value: '', action: '' }];
    handleChange('buttons', newButtons);
  };

  const removeButton = (index) => {
    const newButtons = [...(data.buttons || [])];
    newButtons.splice(index, 1);
    handleChange('buttons', newButtons);
  };

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  const handleButtonSelect = (index) => {
    if (data?.onButtonSelect) {
      data.onButtonSelect(index);
    }
  };

  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      border: '2px solid #2684ff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '220px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <Handle type="target" position={Position.Left} 
        style={{
          width: '14px',
          height: '14px',
          backgroundColor: '#000000',
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)'
        }}/>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: '#2684ff',
          fontWeight: '600'
        }}>
          Button Block
        </h4>
        <button 
          onClick={handleDelete}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#ff6b6b',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: '13px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Message:
          </label>
          <textarea
            value={data.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Enter your message..."
            style={{
              width: '90%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              minHeight: '50px',
              resize: 'vertical',
              fontSize: '12px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}>
            <label style={{ 
              fontWeight: '500',
              color: '#555'
            }}>
              Buttons:
            </label>
            <button
              onClick={addButton}
              style={{
                padding: '4px 8px',
                background: '#e3f2fd',
                border: '2px solid #bbdefb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#1976d2'
              }}
            >
              + Add
            </button>
          </div>
          
          {(data.buttons || []).map((button, index) => (
            <div key={index} style={{ 
              marginBottom: '8px',
              padding: '8px',
              border: '2px solid #f0f0f0',
              borderRadius: '4px',
              backgroundColor: '#fafafa'
            }}>
              <input
                type="text"
                value={button.text || ''}
                onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                placeholder="Button text"
                style={{
                  width: '90%',
                  padding: '6px',
                  marginBottom: '6px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <input
                type="text"
                value={button.value || ''}
                onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                placeholder="Value (for database)"
                style={{
                  width: '90%',
                  padding: '6px',
                  marginBottom: '6px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleButtonSelect(index)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    background: '#e8f5e9',
                    border: '2px solid #c8e6c9',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Connect
                </button>
                <button
                  onClick={() => removeButton(index)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    background: '#ffebee',
                    border: '2px solid #ffcdd2',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '10px', 
          borderTop: '2px solid #f0f0f0'
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Timing:
          </label>
          <select
            value={data.delay || '0'}
            onChange={(e) => handleChange('delay', e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '4px',
              border: '2px solid #e0e0e0',
              fontSize: '12px'
            }}
          >
            <option value="0">Send immediately</option>
            <option value="300">After 5 minutes</option>
            <option value="1800">After 30 minutes</option>
            <option value="3600">After 1 hour</option>
          </select>
        </div>
      </div>
      
      {(data.buttons || []).map((_, index) => (
        <Handle
          key={`button-${index}`}
          type="source"
          position={Position.Right}
          id={`button-${index}`}
          style={{ top: 90 + index * 60,
          width: '14px',
          height: '14px',
          backgroundColor: '#000000',
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)'
        }}
        />
      ))}
    </div>
  );
};

export default React.memo(ButtonNode);