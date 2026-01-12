import React, { useState, useEffect, useCallback } from 'react';
import TableDataViewer from './TableDataViewer';

const API_BASE_URL = 'http://localhost:8000';

const DatabaseManager = React.memo(({ bot, onSave }) => {
  const [activeTab, setActiveTab] = useState('structure');
  const [dbConfig, setDbConfig] = useState({ tables: [], schema: {} });
  const [newTable, setNewTable] = useState({ name: '', columns: [] });
  const [newColumn, setNewColumn] = useState({ name: '', type: 'TEXT' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [importMode, setImportMode] = useState(false);
  const [dbFile, setDbFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTable, setEditingTable] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [editColumnData, setEditColumnData] = useState({ name: '', type: 'TEXT' });

  useEffect(() => {
    const config = bot.config?.dbConfig || { tables: [], schema: {} };
    setDbConfig({
      tables: Array.isArray(config.tables) ? [...config.tables] : [],
      schema: typeof config.schema === 'object' ? {...config.schema} : {}
    });
  }, [bot.config]);

  const tables = dbConfig.tables || [];
  
  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveDatabaseConfig = useCallback(async (configToSave) => {
    try {
      setLoading(true);
      await onSave(configToSave);
      setError(null);
    } catch (err) {
      setError('Failed to save database configuration');
    } finally {
      setLoading(false);
    }
  }, [onSave]);

  const addTable = useCallback(() => {
    if (!newTable.name.trim()) return;

    const tableName = newTable.name.trim();
    const updatedConfig = {
      tables: [...tables, {
        name: tableName,
        columns: [...newTable.columns]
      }],
      schema: {
        ...dbConfig.schema,
        [tableName]: []
      }
    };

    setDbConfig(updatedConfig);
    saveDatabaseConfig(updatedConfig);
    setNewTable({ name: '', columns: [] });
  }, [newTable, tables, dbConfig.schema, saveDatabaseConfig]);

  const addColumn = useCallback(() => {
    if (!newColumn.name.trim()) return;

    setNewTable(prev => ({
      ...prev,
      columns: [...prev.columns, { 
        name: newColumn.name.trim(), 
        type: newColumn.type 
      }]
    }));
    setNewColumn({ name: '', type: 'TEXT' });
  }, [newColumn]);

  const removeTable = useCallback((tableName) => {
    const newTables = tables.filter(t => t.name !== tableName);
    const newSchema = {...dbConfig.schema};
    delete newSchema[tableName];

    const updatedConfig = {
      tables: newTables,
      schema: newSchema
    };

    setDbConfig(updatedConfig);
    saveDatabaseConfig(updatedConfig);
    setConfirmDelete(null);
  }, [tables, dbConfig.schema, saveDatabaseConfig]);

  const removeColumn = useCallback((colIndex) => {
    if (colIndex < 0 || colIndex >= newTable.columns.length) return;
    const newColumns = newTable.columns.filter((_, i) => i !== colIndex);
    setNewTable(prev => ({ ...prev, columns: newColumns }));
  }, [newTable.columns]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDbFile(file);
    setImportMode(true);
  }, []);

  const startEditColumn = useCallback((tableName, columnIndex) => {
    const table = tables.find(t => t.name === tableName);
    if (!table || columnIndex < 0 || columnIndex >= table.columns.length) return;
    
    setEditingTable(tableName);
    setEditingColumn(columnIndex);
    setEditColumnData({ ...table.columns[columnIndex] });
  }, [tables]);

  const saveColumnEdit = useCallback(() => {
    if (!editingTable || editingColumn === null) return;
    
    const updatedTables = tables.map(table => {
      if (table.name === editingTable) {
        const updatedColumns = [...table.columns];
        updatedColumns[editingColumn] = { ...editColumnData };
        return { ...table, columns: updatedColumns };
      }
      return table;
    });

    const updatedConfig = {
      tables: updatedTables,
      schema: dbConfig.schema
    };

    setDbConfig(updatedConfig);
    saveDatabaseConfig(updatedConfig);
    cancelEditColumn();
  }, [editingTable, editingColumn, editColumnData, tables, dbConfig.schema, saveDatabaseConfig]);

  const cancelEditColumn = useCallback(() => {
    setEditingTable(null);
    setEditingColumn(null);
    setEditColumnData({ name: '', type: 'TEXT' });
  }, []);

  const importDatabase = useCallback(async () => {
    if (!dbFile) return;

    try {
      setLoading(true);
      setUploadProgress('Analyzing database...');

      const formData = new FormData();
      formData.append('db_file', dbFile);
      formData.append('bot_id', bot.id);

      const response = await fetch(`${API_BASE_URL}/api/bots/${bot.id}/import-database/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import database');
      }

      const result = await response.json();
      
      const hasUsersTable = result.tables.some(t => t.name.toLowerCase() === 'users');
      
      if (!hasUsersTable) {
        result.tables.unshift({
          name: 'users',
          columns: [
            { name: 'user_id', type: 'INTEGER' },
            { name: 'username', type: 'TEXT' },
            { name: 'first_name', type: 'TEXT' },
            { name: 'last_name', type: 'TEXT' },
            { name: 'language_code', type: 'TEXT' },
            { name: 'is_bot', type: 'INTEGER' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'first_seen', type: 'DATETIME' },
            { name: 'last_active', type: 'DATETIME' }
          ]
        });
      }

      setDbConfig({
        tables: result.tables,
        schema: result.schema || {}
      });

      await saveDatabaseConfig({
        tables: result.tables,
        schema: result.schema || {}
      });

      setUploadProgress(null);
      setImportMode(false);
      setDbFile(null);
    } catch (err) {
      setError(err.message);
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  }, [dbFile, bot.id, saveDatabaseConfig]);

  const cancelImport = useCallback(() => {
    setImportMode(false);
    setDbFile(null);
    setUploadProgress(null);
  }, []);

  return (
    <div className="db-manager-container">
      <h3 className="db-manager-title">Database Manager: {bot.name}</h3>
      
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveTab('structure')}
        >
          Structure
        </button>
        <button 
          className={`tab-button ${activeTab === 'data' ? 'active' : ''} ${tables.length === 0 ? 'disabled' : ''}`}
          onClick={() => setActiveTab('data')}
          disabled={tables.length === 0}
        >
          Data
        </button>
        <button 
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="error-close">
            ×
          </button>
        </div>
      )}
      
      {activeTab === 'structure' ? (
        <div className="structure-container">
          <div className="tables-section">
            <div className="section-header">
              <h4 className="section-title">Existing Tables</h4>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <span className="table-count">{filteredTables.length} tables</span>
              </div>
            </div>
            
            {filteredTables.length === 0 ? (
              <div className="empty-state">
                {searchQuery ? (
                  <p>No tables found matching "{searchQuery}"</p>
                ) : (
                  <p>No tables created yet</p>
                )}
              </div>
            ) : (
              <div className="tables-scroll-container">
                <div className="tables-grid">
                  {filteredTables.map((table) => (
                    <div key={table.name} className="table-card">
                      <div className="table-header">
                        <div className="table-name">{table.name}</div>
                        {table.name.toLowerCase() !== 'users' && (
                          <button 
                            onClick={() => setConfirmDelete(table.name)}
                            className="delete-button"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="columns-container">
                        <div className="columns-grid">
                          {table.columns.map((col, colIndex) => (
                            <div key={colIndex} className="column-item">
                              {editingTable === table.name && editingColumn === colIndex ? (
                                <div className="column-edit-form">
                                  <input
                                    type="text"
                                    value={editColumnData.name}
                                    onChange={(e) => setEditColumnData(prev => ({...prev, name: e.target.value}))}
                                    className="edit-column-input"
                                  />
                                  <select
                                    value={editColumnData.type}
                                    onChange={(e) => setEditColumnData(prev => ({...prev, type: e.target.value}))}
                                    className="edit-column-select"
                                  >
                                    <option value="TEXT">TEXT</option>
                                    <option value="INTEGER">INTEGER</option>
                                    <option value="REAL">REAL</option>
                                    <option value="BLOB">BLOB</option>
                                    <option value="NUMERIC">NUMERIC</option>
                                    <option value="BOOLEAN">BOOLEAN</option>
                                    <option value="DATE">DATE</option>
                                    <option value="DATETIME">DATETIME</option>
                                  </select>
                                  <div className="column-edit-actions">
                                    <button onClick={saveColumnEdit} className="save-edit-button">
                                      Save
                                    </button>
                                    <button onClick={cancelEditColumn} className="cancel-edit-button">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="column-name">{col.name}</span>
                                  <span className="column-type">{col.type}</span>
                                  <button 
                                    onClick={() => startEditColumn(table.name, colIndex)}
                                    className="edit-column-button"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="create-section">
            <div className="section">
              <h4 className="section-title">Create New Table</h4>
              <div className="form-group">
                <label>Table Name:</label>
                <input
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter table name"
                  className="form-input"
                />
              </div>
              
              <div className="columns-section">
                <h5 className="columns-title">Columns</h5>
                {newTable.columns.length > 0 && (
                  <div className="columns-preview">
                    {newTable.columns.map((col, index) => (
                      <div key={index} className="column-preview-item">
                        <span>{col.name} ({col.type})</span>
                        <button 
                          onClick={() => removeColumn(index)}
                          className="remove-column-button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="column-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Column Name:</label>
                      <input
                        type="text"
                        value={newColumn.name}
                        onChange={(e) => setNewColumn(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Column name"
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Type:</label>
                      <select
                        value={newColumn.type}
                        onChange={(e) => setNewColumn(prev => ({ ...prev, type: e.target.value }))}
                        className="type-select"
                      >
                        <option value="TEXT">TEXT</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="REAL">REAL</option>
                        <option value="BLOB">BLOB</option>
                        <option value="NUMERIC">NUMERIC</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="DATE">DATE</option>
                        <option value="DATETIME">DATETIME</option>
                      </select>
                    </div>
                  </div>
                  
                  <button 
                    onClick={addColumn}
                    disabled={!newColumn.name.trim()}
                    className="add-column-button"
                  >
                    Add Column
                  </button>
                </div>
              </div>
              
              <button 
                onClick={addTable}
                disabled={!newTable.name.trim() || newTable.columns.length === 0}
                className="create-table-button"
              >
                Create Table
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'data' ? (
        <TableDataViewer botId={bot.id} />
      ) : (
        <div className="section">
          <h4 className="section-title">Import SQLite Database</h4>
          {!importMode ? (
            <>
              <div className="form-group">
                <label>Upload SQLite Database File:</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".db,.sqlite,.sqlite3"
                  className="form-input"
                />
              </div>
              <p className="import-note">
                Note: Importing will replace the current database structure. 
                The system will automatically add a 'users' table if it doesn't exist.
              </p>
            </>
          ) : (
            <div className="import-panel">
              <h5>Import Database</h5>
              <p>File: {dbFile.name}</p>
              
              {uploadProgress && (
                <div className="progress-message">
                  <p>{uploadProgress}</p>
                  <div className="progress-bar">
                    <div className="progress-indicator" />
                  </div>
                </div>
              )}
              
              <div className="import-actions">
                <button
                  onClick={importDatabase}
                  disabled={loading}
                  className="import-button primary"
                >
                  {loading ? 'Importing...' : 'Confirm Import'}
                </button>
                <button
                  onClick={cancelImport}
                  disabled={loading}
                  className="import-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h4>Confirm Deletion</h4>
            <p>Are you sure you want to delete table "{confirmDelete}"? All data will be permanently lost.</p>
            <div className="modal-actions">
              <button 
                onClick={() => removeTable(confirmDelete)}
                disabled={loading}
                className="modal-button danger"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button 
                onClick={() => setConfirmDelete(null)}
                className="modal-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .db-manager-container {
          padding: 10px;
          max-width: 1800px;
          margin: 0 0 0 0px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .structure-container {
          display: flex;
          gap: 20px;
          flex-grow: 1;
          min-height: 0;
          width: 100%;
        }
        
        .tables-section {
          flex: 3;
          display: flex;
          flex-direction: column;
          background-color: white;
          border-radius: 6px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
          height: 80%;
          min-width: 50%;
        }
        
        .create-section {
          flex: 1;
          min-width: 300px;
          max-width: 350px;
          height:80%
        }
        
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .tab-button {
          padding: 10px 20px;
          border: none;
          background-color: transparent;
          cursor: pointer;
          font-size: 1rem;
          color: #555;
          position: relative;
        }
        
        .tab-button.active {
          color: #1976d2;
          font-weight: bold;
        }
        
        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #1976d2;
        }
        
        .tab-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #d32f2f;
          background-color: #ffebee;
          padding: 12px 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 4px solid #f44336;
        }
        
        .error-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          color: #d32f2f;
          padding: 0;
        }
        
        .section {
          background-color: white;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .section-title {
          color: #333;
          margin-top: 0;
          margin-bottom: 0;
          font-size: 1.2rem;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-width: 200px;
        }
        
        .table-count {
          font-size: 0.9rem;
          color: #666;
        }
        
        .empty-state {
          text-align: center;
          padding: 20px;
          color: #666;
          background-color: #fafafa;
          border-radius: 4px;
          border: 1px dashed #ddd;
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .tables-scroll-container {
          flex-grow: 1;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 5px;
          min-height: 300px;
        }

        .tables-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          align-content: flex-start;
        }

        .table-card {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: white;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          min-height: 120px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .table-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #eee;
          background-color: #f9f9f9;
          border-radius: 6px 6px 0 0;
        }
        
        .table-name {
          font-weight: bold;
          font-size: 1rem;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .delete-button {
          padding: 5px 10px;
          background-color: #ffebee;
          color: #c62828;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .delete-button:hover {
          background-color: #ffcdd2;
        }
        
        .columns-container {
          flex-grow: 1;
          overflow-y: auto;
          padding: 10px;
          scrollbar-width: thin;
          scrollbar-color: #ddd #f5f5f5;
        }

        .columns-container::-webkit-scrollbar {
          width: 6px;
        }

        .columns-container::-webkit-scrollbar-track {
          background: #f5f5f5;
        }

        .columns-container::-webkit-scrollbar-thumb {
          background-color: #ddd;
          border-radius: 6px;
        }
        
        .columns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        
        .column-item {
          background-color: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
          font-size: 0.9rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        
        .column-name {
          font-weight: 500;
          margin-right: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .column-type {
          color: #666;
          font-size: 0.8em;
          flex-shrink: 0;
        }
        
        .edit-column-button {
          background-color: #e3f2fd;
          color: #1976d2;
          border: none;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.8rem;
          cursor: pointer;
          margin-left: 5px;
        }
        
        .edit-column-button:hover {
          background-color: #bbdefb;
        }
        
        .column-edit-form {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 100%;
        }
        
        .edit-column-input {
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 0.9rem;
        }
        
        .edit-column-select {
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 0.9rem;
        }
        
        .column-edit-actions {
          display: flex;
          gap: 5px;
          margin-top: 5px;
        }
        
        .save-edit-button {
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 3px 8px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        
        .save-edit-button:hover {
          background-color: #388e3c;
        }
        
        .cancel-edit-button {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 3px 8px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        
        .cancel-edit-button:hover {
          background-color: #d32f2f;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }
        
        .form-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .form-input:focus {
          border-color: #2196f3;
          outline: none;
        }
        
        .columns-section {
          margin-top: 20px;
        }
        
        .columns-title {
          margin-bottom: 10px;
          color: #555;
          font-size: 1rem;
        }
        
        .columns-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 15px;
        }
        
        .column-preview-item {
          background-color: #e3f2fd;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
        }
        
        .remove-column-button {
          background: none;
          border: none;
          color: #1976d2;
          cursor: pointer;
          font-size: 1rem;
          margin-left: 8px;
          padding: 0 4px;
        }
        
        .remove-column-button:hover {
          color: #0d47a1;
        }
        
        .column-form {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        
        .form-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .form-row .form-group {
          flex: 1;
          margin-bottom: 0;
        }
        
        .type-select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .add-column-button {
          padding: 8px 16px;
          background-color: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .add-column-button:hover {
          background-color: #1976d2;
        }
        
        .add-column-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .create-table-button {
          padding: 10px 20px;
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          width: 100%;
        }
        
        .create-table-button:hover {
          background-color: #388e3c;
        }
        
        .create-table-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .confirmation-modal {
          background-color: white;
          padding: 20px;
          border-radius: 6px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        
        .confirmation-modal h4 {
          margin-top: 0;
          color: #d32f2f;
        }
        
        .confirmation-modal p {
          margin-bottom: 20px;
          color: #333;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        .modal-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .modal-button.danger {
          background-color: #d32f2f;
          color: white;
        }
        
        .modal-button.danger:hover {
          background-color: #b71c1c;
        }
        
        .import-note {
          color: #666;
          font-size: 0.9rem;
          margin-top: 15px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        
        .import-panel {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 6px;
        }
        
        .progress-message {
          margin: 15px 0;
        }
        
        .progress-bar {
          height: 6px;
          background-color: #e0e0e0;
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }
        
        .progress-indicator {
          height: 100%;
          width: 60%;
          background-color: #4caf50;
          animation: progress 2s ease-in-out infinite;
        }
        
        @keyframes progress {
          0% { width: 30%; }
          50% { width: 70%; }
          100% { width: 30%; }
        }
        
        .import-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .import-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .import-button.primary {
          background-color: #2196f3;
          color: white;
        }
        
        .import-button.primary:hover {
          background-color: #1976d2;
        }
        
        .import-button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
});

export default DatabaseManager;