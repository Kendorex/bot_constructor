import React from 'react';

const WidgetPalette = ({ onAddWidget }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{
      width: '250px',
      padding: '15px',
      background: '#f8f9fa',
      borderRight: '1px solid #ddd',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ marginTop: 0 }}>Widgets</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '10px', color: '#555' }}>Flow Control</h4>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'startend')}
          onClick={() => onAddWidget('startend')}
        >
          Start/End
        </div>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'condition')}
          onClick={() => onAddWidget('condition')}
        >
          Condition
        </div>
        <div
          style={{ ...widgetItemStyle, backgroundColor: '#fff3e0', borderColor: '#ffcc80' }}
          draggable
          onDragStart={(event) => onDragStart(event, 'broadcast')}
          onClick={() => onAddWidget('broadcast')}
        >
          Рассылка
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '10px', color: '#555' }}>Message Types</h4>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'text')}
          onClick={() => onAddWidget('text')}
        >
          Text
        </div>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'button')}
          onClick={() => onAddWidget('button')}
        >
          Button
        </div>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'image')}
          onClick={() => onAddWidget('image')}
        >
          Image
        </div>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'menu')}
          onClick={() => onAddWidget('menu')}
        >
          Menu
        </div>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'inline')}
          onClick={() => onAddWidget('inline')}
        >
          Inline Buttons
        </div>
      </div>
      
      <div>
        <h4 style={{ marginBottom: '10px', color: '#555' }}>Data Input</h4>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'input')}
          onClick={() => onAddWidget('input')}
        >
          User Input Handler
        </div>
        <div
          style={widgetItemStyle}
          draggable
          onDragStart={(event) => onDragStart(event, 'dboutput')}
          onClick={() => onAddWidget('dboutput')}
        >
          DB Output
        </div>
      </div>
    </div>
  );
};

const widgetItemStyle = {
  padding: '8px 12px',
  marginBottom: '8px',
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'grab',
  fontSize: '14px',
  ':hover': {
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }
};

export default WidgetPalette;