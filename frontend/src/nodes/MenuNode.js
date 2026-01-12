import React, { useState, useEffect, useCallback } from 'react';
import { Handle } from 'reactflow';

const MenuNode = ({ id, data, selected, isConnectable }) => {
  // Инициализация состояния
  const [menuText, setMenuText] = useState(data?.text || '');
  const [items, setItems] = useState(data?.items || []);

  // Обновление состояния при изменении props
  useEffect(() => {
    if (data?.text !== undefined && data.text !== menuText) {
      setMenuText(data.text);
    }
    if (data?.items && JSON.stringify(data.items) !== JSON.stringify(items)) {
      setItems(data.items);
    }
  }, [data]);

  // Обработчик изменений
  const handleChange = useCallback((newData) => {
    if (data?.onChange) {
      data.onChange(id, newData);
    }
  }, [data, id]);

  // Обработчик текста меню
  const handleTextChange = useCallback((e) => {
    const newText = e.target.value;
    setMenuText(newText);
    handleChange({ text: newText });
  }, [handleChange]);

  // Обработчик изменения текста пункта меню
  const handleItemTextChange = useCallback((index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    handleChange({ items: newItems });
  }, [items, handleChange]);

  // Добавление нового пункта меню
  const addItem = useCallback(() => {
    const newItem = { 
      text: `Item ${items.length + 1}`,
      action: `action_${items.length + 1}`
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    handleChange({ items: newItems });
  }, [items, handleChange]);

  // Удаление пункта меню
  const removeItem = useCallback((index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    handleChange({ items: newItems });
  }, [items, handleChange]);

  // Удаление узла
  const handleDelete = useCallback(() => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  }, [data, id]);

  return (
    <div className={`menu-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span>Menu</span>
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
          value={menuText}
          onChange={handleTextChange}
          placeholder="Menu title"
          className="node-input"
        />
        
        <div className="menu-items">
          <h4>Menu Items:</h4>
          {items.map((item, index) => (
            <div key={index} className="menu-item">
              <input
                type="text"
                value={item.text || ''}
                onChange={(e) => handleItemTextChange(index, 'text', e.target.value)}
                placeholder="Item text"
                className="menu-item-input"
              />
              <input
                type="text"
                value={item.action || ''}
                onChange={(e) => handleItemTextChange(index, 'action', e.target.value)}
                placeholder="Action"
                className="menu-item-input"
              />
              <button 
                className="remove-item-btn"
                onClick={() => removeItem(index)}
              >
                ×
              </button>
              
              <Handle
                type="source"
                position="right"
                id={`${id}-item-${index}`}
                style={{ top: 70 + index * 60 }}
                isConnectable={isConnectable}
              />
            </div>
          ))}
          <button onClick={addItem} className="add-item-btn">
            + Add Item
          </button>
        </div>
      </div>
      
      <Handle
        type="target"
        position="left"
        id={`${id}-target`}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default React.memo(MenuNode);