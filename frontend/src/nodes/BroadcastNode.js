import React from 'react';
import { Handle } from 'reactflow';

const BroadcastNode = ({ id, data, selected, isConnectable }) => {
  const handleTimeChange = (e) => {
    data.onChange(id, { broadcastTime: e.target.value });
  };

  const handleFrequencyChange = (e) => {
    data.onChange(id, { frequency: e.target.value });
  };

  const handleTargetChange = (e) => {
    data.onChange(id, { target: e.target.value });
  };

  const handleDelete = () => {
    data.onDelete(id);
  };

  return (
    <div style={{
      padding: '10px',
      borderRadius: '5px',
      border: '2px solid #ff9800',
      backgroundColor: '#fff3e0',
      minWidth: '200px',
      boxShadow: selected ? '0 0 0 2px #ff9800' : 'none'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #ffcc80',
        paddingBottom: '5px'
      }}>
        <span style={{ fontWeight: 'bold', color: '#e65100' }}>Рассылка</span>
        <button 
          onClick={handleDelete}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#e65100',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
          Время рассылки
        </label>
        <input
          type="time"
          value={data.broadcastTime || ''}
          onChange={handleTimeChange}
          style={{
            width: '100%',
            padding: '5px',
            borderRadius: '3px',
            border: '1px solid #ffcc80'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
          Частота
        </label>
        <select
          value={data.frequency || 'daily'}
          onChange={handleFrequencyChange}
          style={{
            width: '100%',
            padding: '5px',
            borderRadius: '3px',
            border: '1px solid #ffcc80'
          }}
        >
          <option value="daily">Ежедневно</option>
          <option value="weekly">Еженедельно</option>
          <option value="monthly">Ежемесячно</option>
          <option value="once">Один раз</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
          Целевая аудитория
        </label>
        <select
          value={data.target || 'all'}
          onChange={handleTargetChange}
          style={{
            width: '100%',
            padding: '5px',
            borderRadius: '3px',
            border: '1px solid #ffcc80'
          }}
        >
          <option value="all">Все пользователи</option>
          <option value="active">Активные пользователи</option>
          <option value="inactive">Неактивные пользователи</option>
          <option value="segment">По сегменту</option>
        </select>
      </div>
      
      <Handle
        type="source"
        position="right"
        id={`${id}-source`}
        isConnectable={isConnectable}
        style={{ backgroundColor: '#ff9800', width: '10px', height: '10px' }}
      />
    </div>
  );
};

export default BroadcastNode;