import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

const DBOutputNode = ({ id, data }) => {
  const {
    dbConfig = { tables: [], schema: {} },
    message: dataMessage = '',
    table: dataTable = '',
    columns: dataColumns = [],
    customQuery: dataCustomQuery = '',
    useCustomQuery: dataUseCustomQuery = false,
    onChange,
    onDelete,
  } = data;

  const [tables, setTables] = useState(dbConfig.tables || []);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [localData, setLocalData] = useState({
    message: dataMessage,
    table: dataTable,
    columns: dataColumns,
    customQuery: dataCustomQuery,
    useCustomQuery: dataUseCustomQuery,
    buttonValue: data.buttonValue || '',
  });

  useEffect(() => {
    setTables(dbConfig.tables || []);
    
    if (dataTable) {
      const table = dbConfig.tables.find(t => t.name === dataTable);
      setAvailableColumns(table?.columns || []);
    }
  }, [dbConfig.tables, dataTable]);

  const handleChange = (newData) => {
    setLocalData(prev => {
      const updated = { ...prev, ...newData };
      onChange?.(id, {
        message: updated.message,
        table: updated.table,
        columns: updated.columns,
        customQuery: updated.customQuery,
        useCustomQuery: updated.useCustomQuery,
        buttonValue: updated.buttonValue,
      });
      return updated;
    });
  };

  const handleTableChange = (e) => {
    const tableName = e.target.value;
    const table = tables.find(t => t.name === tableName);
    const columns = table?.columns || [];
    
    setAvailableColumns(columns);
    handleChange({
      table: tableName,
      columns: [],
      customQuery: '',
      useCustomQuery: false
    });
  };

  const toggleColumn = (columnName) => {
    const newColumns = localData.columns.includes(columnName)
      ? localData.columns.filter(c => c !== columnName)
      : [...localData.columns, columnName];
    
    handleChange({ columns: newColumns });
  };

  const toggleQueryMode = () => {
    handleChange({ 
      useCustomQuery: !localData.useCustomQuery,
      columns: [],
      customQuery: ''
    });
  };

  const handleDelete = () => onDelete?.(id);

  const nodeColor = '#e67e22';

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
          width: '16px',
          height: '16px',
          backgroundColor: nodeColor,
          border: '2px solid white',
          boxShadow: '0 0 4px rgba(0,0,0,0.3)'
        }}
      />
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '10px',
        borderBottom: `2px solid ${nodeColor}20`
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '16px', 
          color: nodeColor,
          fontWeight: '600'
        }}>
          Database Output
        </h4>
        <button 
          onClick={handleDelete}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#ff6b6b',
            fontWeight: 'bold',
            padding: '0 5px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: '14px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Message:
          </label>
          <textarea
            value={localData.message}
            onChange={(e) => handleChange({ message: e.target.value })}
            placeholder="Enter message to show before data"
            style={{
              width: '93%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              minHeight: '80px',
              resize: 'vertical',
              fontSize: '13px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Use button value (optional):
          </label>
          <input
            type="text"
            value={localData.buttonValue || ''}
            onChange={(e) => handleChange({ buttonValue: e.target.value })}
            placeholder="Enter variable name (e.g. button_value)"
            style={{
              width: '93%',
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Use {'{button_value}'} in SQL query to insert selected button value
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            backgroundColor: localData.useCustomQuery ? '#f0f7ff' : '#f9f9f9',
            transition: 'background-color 0.2s'
          }}>
            <input
              type="checkbox"
              checked={localData.useCustomQuery}
              onChange={toggleQueryMode}
              style={{ 
                marginRight: '10px',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontWeight: '500' }}>Use custom SQL query</span>
          </label>
        </div>
        
        {localData.useCustomQuery ? (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#555'
            }}>
              SQL Query:
            </label>
            <textarea
              value={localData.customQuery}
              onChange={(e) => handleChange({ customQuery: e.target.value })}
              placeholder="SELECT * FROM table WHERE column = '{button_value}'"
              style={{
                width: '93%',
                padding: '10px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}
            />
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
              Example: SELECT * FROM courses WHERE name LIKE '%{'{button_value}'}%'
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#555'
              }}>
                Table:
              </label>
              <select
                value={localData.table}
                onChange={handleTableChange}
                disabled={!tables.length}
                style={{
                  width: '93%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: tables.length ? '#fff' : '#fafafa',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="">{tables.length ? 'Select table' : 'No tables available'}</option>
                {tables.map(table => (
                  <option key={table.name} value={table.name}>{table.name}</option>
                ))}
              </select>
            </div>
            
            {localData.table && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#555'
                }}>
                  Columns:
                </label>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '2px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '10px',
                  backgroundColor: '#fafafa'
                }}>
                  {availableColumns.length ? (
                    availableColumns.map(col => (
                      <div key={col.name} style={{ 
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: localData.columns.includes(col.name) ? '#e3f2fd' : '#fff',
                        border: `1px solid ${localData.columns.includes(col.name) ? '#bbdefb' : '#eee'}`,
                        transition: 'all 0.2s'
                      }}>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={localData.columns.includes(col.name)}
                            onChange={() => toggleColumn(col.name)}
                            style={{ 
                              marginRight: '10px',
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer'
                            }}
                          />
                          <span>
                            <strong>{col.name}</strong> <span style={{ color: '#666' }}>({col.type})</span>
                          </span>
                        </label>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      color: '#999', 
                      padding: '10px',
                      textAlign: 'center'
                    }}>
                      No columns available
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{
          width: '16px',
          height: '16px',
          backgroundColor: nodeColor,
          border: '2px solid white',
          boxShadow: '0 0 4px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
};

export default React.memo(DBOutputNode);