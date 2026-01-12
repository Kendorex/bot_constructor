import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const TableDataViewer = ({ botId }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [newRow, setNewRow] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load tables list
  useEffect(() => {
    if (!botId) return;
    
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/tables/`);
        setTables(response.data.tables || []);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
  }, [botId]);

  // Load table data when selected
  useEffect(() => {
    if (!selectedTable || !botId) return;
    
    const fetchTableData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/`);
        
        const dataWithIds = response.data.data.map((row, index) => ({
          ...row,
          rowid: index + 1
        }));
        
        setTableData(dataWithIds || []);
        setColumns(response.data.columns || []);
        setEditingRow(null);
        setNewRow({});
        setShowAddForm(false);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
        setTableData([]);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTableData();
  }, [selectedTable, botId]);

  const handleEdit = (row) => {
    setEditingRow({ ...row });
  };

  const handleEditChange = (column, value) => {
    setEditingRow(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleNewRowChange = (column, value) => {
    setNewRow(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const saveEdit = async () => {
    if (!editingRow || !selectedTable) return;
    
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/save/`,
        [editingRow]
      );
      
      const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/`);
      const dataWithIds = response.data.data.map((row, index) => ({
        ...row,
        rowid: index + 1
      }));
      
      setTableData(dataWithIds);
      setEditingRow(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const addNewRow = async () => {
    if (!selectedTable) return;
    
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/save/`,
        [newRow]
      );
      
      const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/`);
      const dataWithIds = response.data.data.map((row, index) => ({
        ...row,
        rowid: index + 1
      }));
      
      setTableData(dataWithIds);
      setNewRow({});
      setShowAddForm(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (row) => {
    if (!selectedTable || !row.rowid) return;
    
    try {
      setLoading(true);
      const deleteMarker = { ...row, _delete: true };
      await axios.post(
        `${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/save/`,
        [deleteMarker]
      );
      
      const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/`);
      const dataWithIds = response.data.data.map((row, index) => ({
        ...row,
        rowid: index + 1
      }));
      
      setTableData(dataWithIds);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTable = async () => {
    if (!selectedTable) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/api/bots/${botId}/tables/${selectedTable}/delete/`);
      
      // Refresh tables list
      const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/tables/`);
      setTables(response.data.tables || []);
      setSelectedTable('');
      setConfirmDelete(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
};

  if (!botId) {
    return <div className="error-message">Error: Bot ID is not provided</div>;
  }

  return (
    <div className="database-container">
      <h3 className="database-title">Database Content</h3>
      
      <div className="table-selector">
        <div className="selector-row">
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            disabled={loading || !tables.length}
            className="table-select"
          >
            <option value="">Select a table</option>
            {tables.map(table => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
          
          {selectedTable && (
            <button 
              onClick={() => setConfirmDelete(selectedTable)}
              disabled={loading}
              className="delete-table-button"
            >
              Delete Table
            </button>
          )}
        </div>
      </div>
      
      {confirmDelete && (
        <div className="confirmation-dialog">
          <p>Are you sure you want to delete table "{confirmDelete}"? This action cannot be undone.</p>
          <div className="confirmation-buttons">
            <button 
              onClick={deleteTable}
              disabled={loading}
              className="confirm-button danger"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button 
              onClick={() => setConfirmDelete(null)}
              className="confirm-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {selectedTable && (
        <div className="table-actions">
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`action-button ${showAddForm ? 'cancel' : 'add'}`}
          >
            {showAddForm ? 'Cancel' : 'Add New Row'}
          </button>
        </div>
      )}
      
      {showAddForm && selectedTable && (
        <div className="edit-form">
          <h4>Add New Row</h4>
          <div className="form-grid">
            {columns.map(col => (
              <div key={col.name} className="form-group">
                <label>{col.name} <span className="column-type">({col.type})</span></label>
                <input
                  type="text"
                  value={newRow[col.name] || ''}
                  onChange={(e) => handleNewRowChange(col.name, e.target.value)}
                  className="form-input"
                  placeholder={col.type === 'TEXT' ? 'Enter text' : `Enter ${col.type.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <button 
            onClick={addNewRow}
            disabled={loading}
            className="save-button"
          >
            {loading ? 'Saving...' : 'Save Row'}
          </button>
        </div>
      )}
      
      {selectedTable && tableData.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.name}>
                    <div className="column-header">
                      <span>{col.name}</span>
                      <span className="column-type">{col.type}</span>
                    </div>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'even' : 'odd'}>
                  {columns.map(col => (
                    <td key={`${i}-${col.name}`}>
                      {editingRow?.rowid === row.rowid ? (
                        <input
                          type="text"
                          value={editingRow[col.name] || ''}
                          onChange={(e) => handleEditChange(col.name, e.target.value)}
                          className="edit-input"
                        />
                      ) : (
                        <div className="cell-content">
                          {row[col.name] !== null ? String(row[col.name]) : <span className="null-value">NULL</span>}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {editingRow?.rowid === row.rowid ? (
                      <>
                        <button 
                          onClick={saveEdit}
                          disabled={loading}
                          className="action-button save"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingRow(null)}
                          disabled={loading}
                          className="action-button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEdit(row)}
                          className="action-button edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteRow(row)}
                          disabled={loading}
                          className="action-button danger"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {selectedTable && !loading && tableData.length === 0 && !showAddForm && (
        <div className="empty-table">
          <p>No data in this table</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="action-button add"
          >
            Add First Row
          </button>
        </div>
      )}
      
      <style jsx>{`
        .database-container {
          padding: 20px;
          max-width: 100%;
          overflow-x: auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .database-title {
          color: #333;
          margin-bottom: 20px;
          font-size: 1.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        
        .table-selector {
          margin-bottom: 20px;
        }
        
        .selector-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .table-select {
          padding: 10px;
          min-width: 250px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .delete-table-button {
          padding: 10px 15px;
          background-color: #ffebee;
          color: #c62828;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }
        
        .delete-table-button:hover {
          background-color: #ffcdd2;
        }
        
        .delete-table-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .confirmation-dialog {
          background-color: #fff3e0;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #ffa000;
        }
        
        .confirmation-dialog p {
          margin: 0 0 15px 0;
          color: #5d4037;
        }
        
        .confirmation-buttons {
          display: flex;
          gap: 10px;
        }
        
        .confirm-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .confirm-button.danger {
          background-color: #d32f2f;
          color: white;
        }
        
        .confirm-button.danger:hover {
          background-color: #b71c1c;
        }
        
        .error-message {
          color: #d32f2f;
          background-color: #ffebee;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #f44336;
        }
        
        .table-actions {
          margin-bottom: 20px;
        }
        
        .action-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-right: 10px;
          transition: all 0.2s;
        }
        
        .action-button.add {
          background-color: #4caf50;
          color: white;
        }
        
        .action-button.add:hover {
          background-color: #388e3c;
        }
        
        .action-button.edit {
          background-color: #2196f3;
          color: white;
        }
        
        .action-button.edit:hover {
          background-color: #1976d2;
        }
        
        .action-button.save {
          background-color: #ff9800;
          color: white;
        }
        
        .action-button.save:hover {
          background-color: #f57c00;
        }
        
        .action-button.danger {
          background-color: #f44336;
          color: white;
        }
        
        .action-button.danger:hover {
          background-color: #d32f2f;
        }
        
        .action-button.cancel {
          background-color: #9e9e9e;
          color: white;
        }
        
        .action-button.cancel:hover {
          background-color: #616161;
        }
        
        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .edit-form {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .edit-form h4 {
          margin-top: 0;
          color: #333;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .form-group {
          margin-bottom: 0;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }
        
        .column-type {
          font-size: 0.8em;
          color: #777;
          font-weight: normal;
        }
        
        .form-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        
        .save-button {
          padding: 10px 20px;
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .save-button:hover {
          background-color: #388e3c;
        }
        
        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .table-wrapper {
          overflow-x: auto;
          margin-top: 20px;
          border: 1px solid #eee;
          border-radius: 4px;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th {
          background-color: #f5f5f5;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }
        
        .column-header {
          display: flex;
          flex-direction: column;
        }
        
        .data-table td {
          padding: 10px 15px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        
        .data-table tr:hover {
          background-color: #f9f9f9;
        }
        
        .data-table tr.even {
          background-color: #fafafa;
        }
        
        .edit-input {
          width: 100%;
          padding: 6px;
          border: 1px solid #ddd;
          border-radius: 3px;
          box-sizing: border-box;
        }
        
        .cell-content {
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
        
        .null-value {
          color: #999;
          font-style: italic;
        }
        
        .actions-cell {
          white-space: nowrap;
        }
        
        .empty-table {
          text-align: center;
          padding: 40px 20px;
          background-color: #fafafa;
          border-radius: 4px;
          border: 1px dashed #ddd;
        }
        
        .empty-table p {
          color: #666;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default TableDataViewer;