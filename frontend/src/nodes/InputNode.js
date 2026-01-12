import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

const InputNode = ({ id, data }) => {
  const {
    dbConfig = { tables: [], schema: {} },
    prompt: initialPrompt = '',
    table: initialTable = '',
    column: initialColumn = '',
    successMessage: initialSuccessMsg = 'Data saved successfully',
    columns: initialColumns = [],
    inputMode: initialInputMode = 'text',
    buttons: initialButtons = [],
    saveMode: initialSaveMode = 'update_last', // Изменено на 'update_last' по умолчанию
    onChange,
    onDelete,
  } = data;

  const [prompt, setPrompt] = useState(initialPrompt);
  const [table, setTable] = useState(initialTable);
  const [column, setColumn] = useState(initialColumn);
  const [successMessage, setSuccessMessage] = useState(initialSuccessMsg);
  const [columns, setColumns] = useState(initialColumns);
  const [tables, setTables] = useState(dbConfig.tables || []);
  const [inputMode, setInputMode] = useState(initialInputMode);
  const [buttons, setButtons] = useState(initialButtons);
  const [newButtonText, setNewButtonText] = useState('');
  const [newButtonValue, setNewButtonValue] = useState('');
  const [saveMode, setSaveMode] = useState(initialSaveMode);

  useEffect(() => {
    const currentTable = tables.find(t => t.name === table);
    const newColumns = currentTable?.columns || [];
    setColumns(newColumns);
    
    onChange?.(id, {
      prompt,
      table,
      column,
      successMessage,
      columns: newColumns,
      inputMode,
      buttons,
      saveMode
    });
  }, [prompt, table, column, successMessage, tables, id, onChange, inputMode, buttons, saveMode]);

  useEffect(() => {
    setTables(dbConfig.tables || []);
  }, [dbConfig.tables]);

  const handleTableChange = (e) => {
    const newTable = e.target.value;
    setTable(newTable);
    setColumn('');
    
    const currentTable = tables.find(t => t.name === newTable);
    const newColumns = currentTable?.columns || [];
    setColumns(newColumns);
  };

  const handleColumnChange = (e) => {
    setColumn(e.target.value);
  };

  const handleDelete = () => onDelete?.(id);

  const handleAddButton = () => {
    if (newButtonText.trim() && newButtonValue.trim()) {
      setButtons([...buttons, {
        text: newButtonText,
        value: newButtonValue
      }]);
      setNewButtonText('');
      setNewButtonValue('');
    }
  };

  const handleRemoveButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const nodeColor = '#8e44ad';

  return (
    <div style={{ 
      padding: '15px',
      borderRadius: '10px',
      backgroundColor: '#fff',
      border: `2px solid ${nodeColor}`,
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
      minWidth: '280px',
      maxWidth: '360px',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{
          width: '14px',
          height: '14px',
          backgroundColor: nodeColor,
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)'
        }}
      />
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${nodeColor}20`
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: nodeColor,
          fontWeight: '600',
        }}>
          Ввод данных
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
        {/* Режим сохранения */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Режим сохранения:
          </label>
          <select
            value={saveMode}
            onChange={(e) => setSaveMode(e.target.value)}
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="update_last">Обновить последнюю запись</option>
            <option value="new">Создать новую запись</option>
          </select>
        </div>

        {/* Режим ввода */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Режим ввода:
          </label>
          <select
            value={inputMode}
            onChange={(e) => setInputMode(e.target.value)}
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="text">Текстовый ввод</option>
            <option value="buttons">Кнопки</option>
          </select>
        </div>

        {/* Prompt */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Текст запроса:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите текст запроса для пользователя"
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              minHeight: '60px',
              resize: 'vertical',
              fontSize: '12px'
            }}
          />
        </div>
        
        {/* Кнопки (условно показывается) */}
        {inputMode === 'buttons' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontWeight: '500',
              color: '#555'
            }}>
              Кнопки:
            </label>
            {buttons.map((button, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <span style={{ flex: 1 }}>{button.text} → {button.value}</span>
                <button
                  onClick={() => handleRemoveButton(index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ff6b6b',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newButtonText}
                onChange={(e) => setNewButtonText(e.target.value)}
                placeholder="Текст кнопки"
                style={{
                  flex: 1,
                  padding: '6px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '12px', 
                  width:'30%'
                }}
              />
              <input
                type="text"
                value={newButtonValue}
                onChange={(e) => setNewButtonValue(e.target.value)}
                placeholder="Значение"
                style={{
                  flex: 1,
                  padding: '6px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '12px', 
                  width:'30%'
                }}
              />
            </div>
            <button
              onClick={handleAddButton}
              style={{
                padding: '6px 12px',
                background: '#8e44ad',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Добавить кнопку
            </button>
          </div>
        )}
        
        {/* Table Selector */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Целевая таблица:
          </label>
          <select
            value={table}
            onChange={handleTableChange}
            disabled={!tables.length}
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: tables.length ? '#fff' : '#fafafa',
              fontSize: '12px'
            }}
          >
            <option value="">{tables.length ? 'Выберите таблицу' : 'Нет доступных таблиц'}</option>
            {tables.map(table => (
              <option key={table.name} value={table.name}>{table.name}</option>
            ))}
          </select>
        </div>
        
        {/* Column Selector (conditionally shown) */}
        {table && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontWeight: '500',
              color: '#555'
            }}>
              Целевой столбец:
            </label>
            <select
              value={column}
              onChange={handleColumnChange}
              disabled={!columns.length}
              style={{
                width: '93%',
                padding: '8px',
                border: '2px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: columns.length ? '#fff' : '#fafafa',
                fontSize: '12px'
              }}
            >
              <option value="">{columns.length ? 'Выберите столбец' : 'Нет доступных столбцов'}</option>
              {columns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Success Message */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Сообщение об успехе:
          </label>
          <input
            type="text"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            placeholder="Сообщение после успешного сохранения"
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{
          width: '14px',
          height: '14px',
          backgroundColor: nodeColor,
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
};

export default React.memo(InputNode);