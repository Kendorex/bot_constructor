import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const API_BASE_URL = 'http://localhost:8000';

const UsersManager = ({ bot }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchUsers();
  }, [bot.id, searchTerm, page, pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log(`Fetching users for bot ${bot.id} from: ${API_BASE_URL}/api/bots/${bot.id}/users/`);
      const response = await axios.get(`${API_BASE_URL}/api/bots/${bot.id}/users/`, {
        params: {
          search: searchTerm,
          page,
          page_size: pageSize
        }
      });
      
      setUsers(response.data.users);
      setTotalCount(response.data.total_count);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                         err.response?.data?.message || 
                         err.message;
      setError(`Failed to fetch users: ${errorMessage}`);
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="users-manager">
      <div className="card">
        <h2>Bot Users</h2>
        
        {error && <div className="alert error">{error}</div>}
        
        <div className="controls">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        
        {loading ? (
          <div className="loader">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="empty-message">No users found</div>
        ) : (
          <>
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>tgID</th>
                    <th>Username</th>
                    <th>First Seen</th>
                    <th>Last Active</th>
                    <th>Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>@{user.username || 'N/A'}</td>
                      <td>{formatDate(user.first_seen)}</td>
                      <td>{formatDate(user.last_active)}</td>
                      <td>{user.message_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="pagination">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="pagination-button"
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {page} of {Math.ceil(totalCount / pageSize)}
              </span>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersManager;