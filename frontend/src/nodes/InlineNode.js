import React, { useState } from 'react';
import { Handle } from 'reactflow';

const InlineNode = ({ id, data, selected, isConnectable }) => {
  const [buttons, setButtons] = useState(data?.buttons || []);

  const handleChange = (field, value) => {
    if (data?.onChange) {
      data.onChange(id, { [field]: value });
    }
  };

  const handleButtonChange = (index, field, value) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
    handleChange('buttons', newButtons);
  };

  const addButton = () => {
    const newButtons = [...buttons, { text: '', data: '' }];
    setButtons(newButtons);
    handleChange('buttons', newButtons);
  };

  const removeButton = (index) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    setButtons(newButtons);
    handleChange('buttons', newButtons);
  };

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className={`inline-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span>Inline Buttons</span>
        <button 
          className="node-delete-btn"
          onClick={handleDelete}
        >
          ×
        </button>
      </div>
      
      <div className="node-content">
        <textarea
          value={data?.text || ''}
          onChange={(e) => handleChange('text', e.target.value)}
          placeholder="Message text"
          className="node-textarea"
        />
        
        <div className="inline-buttons">
          {buttons.map((button, index) => (
            <div key={index} className="button-row">
              <input
                type="text"
                value={button.text}
                onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                placeholder="Button text"
                className="node-input"
              />
              
              <input
                type="text"
                value={button.data}
                onChange={(e) => handleButtonChange(index, 'data', e.target.value)}
                placeholder="Callback data"
                className="node-input"
              />
              
              <button onClick={() => removeButton(index)} className="remove-button">
                ×
              </button>
            </div>
          ))}
          
          <button onClick={addButton} className="add-button">
            + Add Button
          </button>
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
        id={`${id}-source`}
        isConnectable={isConnectable}
        className="node-handle"
      />
    </div>
  );
};

export default InlineNode;