import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import WidgetPalette from './WidgetPalette';
import DatabaseManager from './DatabaseManager';
import UsersManager from './UsersManager';
import TextNode from './nodes/TextNode';
import ButtonNode from './nodes/ButtonNode';
import ImageNode from './nodes/ImageNode';
import MenuNode from './nodes/MenuNode';
import InlineNode from './nodes/InlineNode';
import StartEndNode from './nodes/StartEndNode';
import ConditionNode from './nodes/ConditionNode';
import InputNode from './nodes/InputNode';
import DBOutputNode from './nodes/DBOutputNode';
import BroadcastNode from './nodes/BroadcastNode';

const API_BASE_URL = 'http://localhost:8000';

const DEFAULT_COMMANDS = [
  { name: '/start', description: 'Start command for the bot' },
  { name: '/help', description: 'Help command' }
];

const nodeTypes = {
  text: TextNode,
  button: ButtonNode,
  image: ImageNode,
  menu: MenuNode,
  inline: InlineNode,
  startend: StartEndNode,
  condition: ConditionNode,
  input: InputNode,
  dboutput: DBOutputNode,
  broadcast: BroadcastNode
};

const BOT_SCHEMAS = {
  support: {
    commands: ['/start', '/help', '/contact'],
    nodes: [
      {
        id: 'start-1',
        type: 'startend',
        position: { x: 100, y: 100 },
        data: { isStart: true, command: '/start' }
      },
      {
        id: 'text-1',
        type: 'text',
        position: { x: 300, y: 100 },
        data: { text: 'Добро пожаловать в поддержку! Чем могу помочь?' }
      },
    ],
    edges: [
      { id: 'e1-2', source: 'start-1', target: 'text-1' }
    ],
    activeCommand: '/start'
  },
  survey: {
    commands: ['/start', '/survey'],
    nodes: [
      {
        id: 'start-1',
        type: 'startend',
        position: { x: 100, y: 100 },
        data: { isStart: true, command: '/start' }
      },
      {
        id: 'text-1',
        type: 'text',
        position: { x: 300, y: 100 },
        data: { text: 'Добро пожаловать в опросник! Начнем?' }
      },
    ],
    edges: [
      { id: 'e1-2', source: 'start-1', target: 'text-1' }
    ],
    activeCommand: '/start'
  },
  ecommerce: {
    commands: ['/start', '/catalog', '/cart'],
    nodes: [
      {
        id: 'start-1',
        type: 'startend',
        position: { x: 100, y: 100 },
        data: { isStart: true, command: '/start' }
      },
      {
        id: 'menu-1',
        type: 'menu',
        position: { x: 300, y: 100 },
        data: { 
          text: 'Добро пожаловать в магазин!',
          items: [
            { text: 'Каталог', action: '/catalog' },
            { text: 'Корзина', action: '/cart' }
          ]
        }
      },
    ],
    edges: [
      { id: 'e1-2', source: 'start-1', target: 'menu-1' }
    ],
    activeCommand: '/start'
  },
  custom: {
    commands: ['/start'],
    nodes: [],
    edges: [],
    activeCommand: '/start'
  }
};

const SchemaSelectionModal = ({ isOpen, onClose, onSelectSchema }) => {
  const schemas = [
    { 
      id: 'support', 
      name: 'Support Bot', 
      description: 'Готовый бот для поддержки клиентов с FAQ и контактами',
      icon: '🛟'
    },
    { 
      id: 'survey', 
      name: 'Survey Bot', 
      description: 'Готовый бот для проведения опросов и сбора данных',
      icon: '📝'
    },
    { 
      id: 'ecommerce', 
      name: 'E-commerce Bot', 
      description: 'Готовый бот для интернет-магазина с каталогом и корзиной',
      icon: '🛒'
    },
    { 
      id: 'custom', 
      name: 'Custom Bot', 
      description: 'Начните с чистого листа и создайте уникального бота',
      icon: '🛠️'
    }
  ];

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0 }}>Выберите схему бота</h2>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Выберите готовую схему или создайте свою с нуля
        </p>
        
        <div style={schemasGridStyle}>
          {schemas.map(schema => (
            <div 
              key={schema.id}
              style={schemaCardStyle}
              onClick={() => onSelectSchema(schema.id)}
            >
              <div style={schemaIconStyle}>{schema.icon}</div>
              <h3 style={{ margin: '10px 0 5px' }}>{schema.name}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>
                {schema.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CommandModal = ({ isOpen, onClose, onAddCommand }) => {
  const [command, setCommand] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (command.trim()) {
      onAddCommand({
        name: command.trim(),
        description: description.trim()
      });
      setCommand('');
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0 }}>Add New Command</h3>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Command Name*</label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/start"
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Command description"
              style={textareaStyle}
            />
          </div>
          <div style={buttonGroupStyle}>
            <button
              type="button"
              onClick={onClose}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={submitButtonStyle}
            >
              Add Command
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FlowBuilder = ({ bot, onSave }) => {
  const [activeTab, setActiveTab] = useState('flow');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [commands, setCommands] = useState(
    bot.config?.commands?.length 
      ? bot.config.commands.map(cmd => 
          typeof cmd === 'string' ? { name: cmd, description: '' } : cmd
        )
      : DEFAULT_COMMANDS
  );
  const [activeCommand, setActiveCommand] = useState(
    bot.config?.activeCommand || '/start'
  );
  const [rfInstance, setRfInstance] = useState(null);
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(null);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [showSchemaModal, setShowSchemaModal] = useState(!bot.selected_schema);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isCommandsPanelCollapsed, setIsCommandsPanelCollapsed] = useState(false);
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    if (!bot.selected_schema) {
      setShowSchemaModal(true);
    }
  }, [bot.selected_schema]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...newData,
            columns: newData.columns ?? node.data.columns,
          }
        };
      }
      return node;
    }));
  }, [setNodes]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    ));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleNodeMouseEnter = useCallback((event, node) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    hoverTimerRef.current = setTimeout(() => {
      setSelectedNode(node);
      setSelectedButtonIndex(null);
    }, 3000);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedButtonIndex(null);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleAddCommand = useCallback((newCommand) => {
    setCommands(prev => [...prev, newCommand]);
    setActiveCommand(newCommand.name);
    setIsCommandModalOpen(false);
  }, []);

  const handleDeleteCommand = useCallback((commandName) => {
    if (commandName === '/start' || commandName === '/help') {
      alert('You cannot delete default commands (/start, /help)');
      return;
    }

    if (commandName === activeCommand) {
      setActiveCommand('/start');
    }

    setCommands(prev => prev.filter(cmd => cmd.name !== commandName));
    setNodes(prev => prev.filter(node => 
      !(node.type === 'startend' && node.data.command === commandName)
    ));
  }, [activeCommand, setNodes]);

  const getInitialData = useCallback((type) => {
    const baseData = { 
      onChange: updateNodeData,
      onDelete: deleteNode,
      commands: commands.map(c => c.name),
      onAddCommand: () => setIsCommandModalOpen(true),
      onButtonSelect: setSelectedButtonIndex,
      dbConfig: bot.config?.dbConfig || { tables: [], schema: {} },
      delay: '0',
      customDelay: ''
    };
    
    switch (type) {
      case 'text': return { ...baseData, text: '' };
      case 'button': return { 
        ...baseData, 
        text: '', 
        buttons: [
          { text: 'Button 1', value: 'button1', action: 'action1' },
          { text: 'Button 2', value: 'button2', action: 'action2' }
        ] 
      };
      case 'image': return { ...baseData, url: '', caption: '' };
      case 'menu': return { 
        ...baseData, 
        text: '', 
        items: [
          { text: 'Item 1', value: 'item1', action: 'action1' }
        ] 
      };
      case 'inline': return { ...baseData, text: '', buttons: [] };
      case 'startend': return { ...baseData, isStart: true, command: '/start' };
      case 'condition': return { ...baseData, condition: '', trueLabel: 'Yes', falseLabel: 'No' };
      case 'input': return {
        ...baseData,
        prompt: '',
        table: '',
        column: '',
        successMessage: 'Data saved successfully',
        columns: []
      };
      case 'dboutput': return {
        ...baseData,
        table: '',
        columns: [],
        customQuery: '',
        message: 'Query results:',
        buttonValue: ''
      };
      case 'broadcast': return {
        ...baseData,
        broadcastTime: '09:00',
        frequency: 'daily',
        target: 'all'
      };
      default: return baseData;
    }
  }, [commands, deleteNode, updateNodeData, bot.config?.dbConfig]);

  useEffect(() => {
    if (bot.config?.nodes) {
      const initializedNodes = bot.config.nodes.map(node => {
        const nodeData = {
          ...getInitialData(node.type),
          ...node.data,
          onChange: updateNodeData,
          onDelete: deleteNode,
          commands: commands.map(c => c.name),
          onAddCommand: () => setIsCommandModalOpen(true),
          onButtonSelect: setSelectedButtonIndex,
          dbConfig: bot.config?.dbConfig || { tables: [], schema: {} }
        };

        if (node.type === 'input') {
          nodeData.columns = node.data.columns || [];
        }

        return {
          ...node,
          data: nodeData
        };
      });
      setNodes(initializedNodes);
    }
    if (bot.config?.edges) {
      setEdges(bot.config.edges);
    }
  }, [bot.config, commands, deleteNode, updateNodeData, setNodes, setEdges, getInitialData]);

  const onConnect = useCallback(
    (params) => {
      const edgeData = {
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
        type: params.sourceHandle?.includes('condition') ? 'smoothstep' : 'default'
      };
  
      if (params.sourceHandle?.startsWith('button-')) {
        const buttonIndex = parseInt(params.sourceHandle.split('-')[1]);
        edgeData.data = { buttonIndex };
      }
  
      setEdges((eds) => addEdge(edgeData, eds));
      setSelectedButtonIndex(null);
    },
    [setEdges]
  );

  const addNode = useCallback((type, position) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: position || { x: Math.random() * 500, y: Math.random() * 500 },
      data: getInitialData(type),
      sourcePosition: 'right',
      targetPosition: 'left'
    };
    
    if (type === 'condition') {
      newNode.data = {
        ...newNode.data,
        trueLabel: 'Yes',
        falseLabel: 'No'
      };
    } else if (type === 'button') {
      newNode.sourceHandles = ['button-0', 'button-1'];
    }
    
    setNodes((nds) => nds.concat(newNode));
  }, [getInitialData, setNodes]);

  const handleSchemaSelect = useCallback(async (schemaId) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/bots/${bot.id}/`, { 
        selected_schema: schemaId,
        config: BOT_SCHEMAS[schemaId]
      });
      
      setShowSchemaModal(false);
      setNodes(BOT_SCHEMAS[schemaId].nodes || []);
      setEdges(BOT_SCHEMAS[schemaId].edges || []);
      setCommands(
        BOT_SCHEMAS[schemaId].commands.map(cmd => 
          typeof cmd === 'string' ? { name: cmd, description: '' } : cmd
        )
      );
    } catch (err) {
      setError(`Failed to select schema: ${err.response?.data?.message || err.message}`);
    }
  }, [bot.id]);

  const saveConfig = useCallback(async () => {
    const preparedNodes = nodes.map(node => {
      const nodeCopy = { ...node };
      const dataCopy = { ...node.data };
      
      delete dataCopy.onChange;
      delete dataCopy.onDelete;
      delete dataCopy.onAddCommand;
      delete dataCopy.onButtonSelect;
      delete dataCopy.dbConfig;
      
      if (node.type === 'input') {
        dataCopy.columns = dataCopy.columns || [];
      }
      
      return {
        ...nodeCopy,
        data: dataCopy
      };
    });

    const preparedEdges = edges.map(edge => ({ ...edge }));

    const config = {
      ...bot.config,
      commands,
      nodes: preparedNodes,
      edges: preparedEdges,
      viewport: rfInstance?.toObject().viewport,
      activeCommand,
      dbConfig: bot.config?.dbConfig || { tables: [], schema: {} }
    };

    await onSave(bot.id, { 
      ...config, 
      selected_schema: bot.selected_schema || 'custom' 
    });
    
    alert('Конфигурация успешно сохранена!');
  }, [bot.id, bot.config, bot.selected_schema, commands, nodes, edges, rfInstance, activeCommand, onSave]);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = rfInstance.project({
      x: event.clientX,
      y: event.clientY - 40,
    });

    addNode(type, position);
  }, [rfInstance, addNode]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const NodeInfoPanel = useMemo(() => {
    if (!selectedNode) return null;

    const renderNodeInfo = () => {
      const { type, data } = selectedNode;
      
      switch (type) {
        case 'text':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Текстовый блок</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Содержание:</label>
                <div style={nodeInfoValueStyle}>{data.text || 'Пусто'}</div>
              </div>
              {data.delay !== '0' && (
                <div style={nodeInfoSectionStyle}>
                  <label style={nodeInfoLabelStyle}>Задержка:</label>
                  <div style={nodeInfoValueStyle}>
                    {data.delay === 'custom' ? data.customDelay + ' мс' : data.delay + ' сек'}
                  </div>
                </div>
              )}
            </>
          );
        case 'button':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Блок кнопок</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Текст сообщения:</label>
                <div style={nodeInfoValueStyle}>{data.text || 'Пусто'}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Кнопки:</label>
                <ul style={nodeInfoListStyle}>
                  {data.buttons?.map((btn, i) => (
                    <li key={i} style={nodeInfoListItemStyle}>
                      <span style={nodeInfoButtonTextStyle}>{btn.text}</span> → 
                      <span style={nodeInfoButtonActionStyle}>{btn.action}</span>
                      {btn.value && (
                        <span style={{ color: '#9c27b0', marginLeft: '5px' }}>
                          (Значение: {btn.value})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          );
        case 'image':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Блок изображения</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>URL изображения:</label>
                <div style={nodeInfoValueStyle}>{data.url || 'Не указан'}</div>
              </div>
              {data.caption && (
                <div style={nodeInfoSectionStyle}>
                  <label style={nodeInfoLabelStyle}>Подпись:</label>
                  <div style={nodeInfoValueStyle}>{data.caption}</div>
                </div>
              )}
            </>
          );
        case 'menu':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Меню</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Текст меню:</label>
                <div style={nodeInfoValueStyle}>{data.text || 'Пусто'}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Пункты меню:</label>
                <ul style={nodeInfoListStyle}>
                  {data.items?.map((item, i) => (
                    <li key={i} style={nodeInfoListItemStyle}>
                      <span style={nodeInfoButtonTextStyle}>{item.text}</span> → 
                      <span style={nodeInfoButtonActionStyle}>{item.action}</span>
                      {item.value && (
                        <span style={{ color: '#9c27b0', marginLeft: '5px' }}>
                          (Значение: {item.value})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          );
        case 'startend':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>{data.isStart ? 'Стартовый блок' : 'Конечный блок'}</h3>
              {data.isStart && (
                <div style={nodeInfoSectionStyle}>
                  <label style={nodeInfoLabelStyle}>Команда:</label>
                  <div style={nodeInfoValueStyle}>{data.command}</div>
                </div>
              )}
            </>
          );
        case 'condition':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Условный блок</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Условие:</label>
                <div style={nodeInfoValueStyle}>{data.condition || 'Не задано'}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Метки:</label>
                <div style={nodeInfoValueStyle}>
                  Да: {data.trueLabel || 'Да'}, Нет: {data.falseLabel || 'Нет'}
                </div>
              </div>
            </>
          );
        case 'input':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Блок ввода в базу данных</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Таблица:</label>
                <div style={nodeInfoValueStyle}>{data.table || 'Не выбрана'}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Поля для ввода:</label>
                <div style={nodeInfoValueStyle}>
                  {data.columns?.length > 0 ? data.columns.join(', ') : 'Не выбраны'}
                </div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Сообщение об успехе:</label>
                <div style={nodeInfoValueStyle}>{data.successMessage}</div>
              </div>
            </>
          );
        case 'dboutput':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Блок вывода из базы данных</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Таблица:</label>
                <div style={nodeInfoValueStyle}>{data.table || 'Не выбрана'}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Поля для вывода:</label>
                <div style={nodeInfoValueStyle}>
                  {data.columns?.length > 0 ? data.columns.join(', ') : 'Все'}
                </div>
              </div>
              {data.customQuery && (
                <div style={nodeInfoSectionStyle}>
                  <label style={nodeInfoLabelStyle}>SQL запрос:</label>
                  <div style={nodeInfoValueStyle}>{data.customQuery}</div>
                </div>
              )}
              {data.buttonValue && (
                <div style={nodeInfoSectionStyle}>
                  <label style={nodeInfoLabelStyle}>Имя переменной:</label>
                  <div style={nodeInfoValueStyle}>{data.buttonValue}</div>
                </div>
              )}
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Шаблон сообщения:</label>
                <div style={nodeInfoValueStyle}>{data.message}</div>
              </div>
            </>
          );
        case 'broadcast':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Блок рассылки</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Время рассылки:</label>
                <div style={nodeInfoValueStyle}>{data.broadcastTime}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Частота:</label>
                <div style={nodeInfoValueStyle}>
                  {data.frequency === 'daily' ? 'Ежедневно' : 
                   data.frequency === 'weekly' ? 'Еженедельно' : 
                   data.frequency === 'monthly' ? 'Ежемесячно' : data.frequency}
                </div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Целевая аудитория:</label>
                <div style={nodeInfoValueStyle}>
                  {data.target === 'all' ? 'Все пользователи' : 
                   data.target === 'active' ? 'Активные пользователи' : 
                   data.target === 'inactive' ? 'Неактивные пользователи' : data.target}
                </div>
              </div>
            </>
          );
        case 'inline':
          return (
            <>
              <h3 style={nodeInfoTitleStyle}>Inline-меню</h3>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Текст:</label>
                <div style={nodeInfoValueStyle}>{data.text || 'Пусто'}</div>
              </div>
              <div style={nodeInfoSectionStyle}>
                <label style={nodeInfoLabelStyle}>Кнопки:</label>
                <ul style={nodeInfoListStyle}>
                  {data.buttons?.map((btn, i) => (
                    <li key={i} style={nodeInfoListItemStyle}>
                      <span style={nodeInfoButtonTextStyle}>{btn.text}</span>
                      {btn.value && (
                        <span style={{ color: '#9c27b0', marginLeft: '5px' }}>
                          (Значение: {btn.value})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          );
        default:
          return <h3 style={nodeInfoTitleStyle}>{type} Node</h3>;
      }
    };

    return (
      <div style={nodeInfoPanelStyle}>
        <div style={nodeInfoHeaderStyle}>
          <h3 style={{ margin: 0 }}>Информация о блоке</h3>
          <button 
            onClick={() => setSelectedNode(null)} 
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>
        {renderNodeInfo()}
        <div style={nodeActionsStyle}>
          <button 
            onClick={() => deleteNode(selectedNode.id)}
            style={deleteButtonStyle}
          >
            Удалить блок
          </button>
        </div>
      </div>
    );
  }, [selectedNode, deleteNode]);

  const commandSelector = useMemo(() => (
    <div style={commandSelectorStyle}>
      <div style={commandSelectRowStyle}>
        <select 
          value={activeCommand} 
          onChange={(e) => setActiveCommand(e.target.value)}
          style={commandSelectStyle}
        >
          {commands.map(cmd => (
            <option key={cmd.name} value={cmd.name}>
              {cmd.name}{cmd.description ? ` - ${cmd.description}` : ''}
            </option>
          ))}
        </select>
        <button 
          onClick={() => setIsCommandModalOpen(true)}
          style={addCommandButtonStyle}
        >
          + Add
        </button>
        <button 
          onClick={() => setIsCommandsPanelCollapsed(!isCommandsPanelCollapsed)}
          style={togglePanelButtonStyle}
          title={isCommandsPanelCollapsed ? "Show commands" : "Hide commands"}
        >
          {isCommandsPanelCollapsed ? "▶" : "▼"}
        </button>
      </div>
      
      {!isCommandsPanelCollapsed && (
        <div style={commandsListStyle}>
          {commands.map(cmd => (
            <div 
              key={cmd.name} 
              style={{
                ...commandItemStyle,
                backgroundColor: activeCommand === cmd.name ? '#f0f7ff' : 'white'
              }}
            >
              <div>
                <strong>{cmd.name}</strong>
                {cmd.description && <div style={commandDescriptionStyle}>{cmd.description}</div>}
              </div>
              {(cmd.name !== '/start' && cmd.name !== '/help') && (
                <button
                  onClick={() => handleDeleteCommand(cmd.name)}
                  style={deleteCommandButtonStyle}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ), [activeCommand, commands, handleDeleteCommand, isCommandsPanelCollapsed]);

  return (
    <div style={flowBuilderStyle}>
      <SchemaSelectionModal 
        isOpen={showSchemaModal} 
        onClose={() => setShowSchemaModal(false)}
        onSelectSchema={handleSchemaSelect}
      />
      
      <CommandModal 
        isOpen={isCommandModalOpen} 
        onClose={() => setIsCommandModalOpen(false)}
        onAddCommand={handleAddCommand}
      />
      
      <div style={tabsStyle}>
        <button 
          style={{
            ...tabButtonStyle,
            ...(activeTab === 'flow' ? activeTabStyle : {})
          }}
          onClick={() => setActiveTab('flow')}
        >
          Flow Builder
        </button>
        <button 
          style={{
            ...tabButtonStyle,
            ...(activeTab === 'database' ? activeTabStyle : {})
          }}
          onClick={() => setActiveTab('database')}
        >
          Database
        </button>
        <button 
          style={{
            ...tabButtonStyle,
            ...(activeTab === 'users' ? activeTabStyle : {})
          }}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      {activeTab === 'flow' ? (
        <div style={flowContainerStyle}>
          <div 
            style={reactFlowWrapperStyle}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setRfInstance}
              onNodeMouseEnter={handleNodeMouseEnter}
              onNodeMouseLeave={handleNodeMouseLeave}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <Panel position="top-right" style={panelStyle}>
                {commandSelector}
                <button 
                  onClick={saveConfig} 
                  style={saveButtonStyle}
                >
                  Save Configuration
                </button>
                {selectedButtonIndex !== null && (
                  <div style={buttonSelectionStyle}>
                    Connecting from button {selectedButtonIndex + 1}
                    <button 
                      onClick={() => setSelectedButtonIndex(null)}
                      style={cancelButtonSelectionStyle}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </Panel>
              {NodeInfoPanel}
            </ReactFlow>
          </div>
          <WidgetPalette onAddWidget={addNode} />
        </div>
      ) : activeTab === 'database' ? (
        <DatabaseManager 
          bot={bot} 
          onSave={(dbConfig) => {
            const updatedConfig = {
              ...bot.config,
              dbConfig
            };
            onSave(bot.id, updatedConfig);
          }}
        />
      ) : (
        <UsersManager bot={bot} />
      )}
    </div>
  );
};

// Styles (остаются такими же, как в предыдущем примере)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '8px',
  width: '800px',
  maxWidth: '90%',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#666'
};

const schemasGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: '20px',
  marginTop: '20px'
};

const schemaCardStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '20px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#4CAF50',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
};

const schemaIconStyle = {
  fontSize: '32px',
  marginBottom: '10px'
};

const formGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '5px' };
const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ddd'
};
const textareaStyle = {
  ...inputStyle,
  minHeight: '80px'
};
const buttonGroupStyle = { 
  display: 'flex', 
  justifyContent: 'flex-end', 
  gap: '10px' 
};
const cancelButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer'
};
const submitButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const flowBuilderStyle = { 
  height: '100vh', 
  display: 'flex', 
  flexDirection: 'column' 
};
const tabsStyle = { 
  display: 'flex', 
  borderBottom: '1px solid #ddd' 
};
const tabButtonStyle = {
  padding: '10px 20px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontWeight: 'normal'
};
const activeTabStyle = {
  backgroundColor: '#f0f0f0',
  fontWeight: 'bold'
};
const flowContainerStyle = { 
  display: 'flex', 
  flex: 1 
};
const reactFlowWrapperStyle = { 
  flex: 1 
};
const panelStyle = {
  backgroundColor: 'white',
  padding: '10px',
  borderRadius: '4px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};
const commandSelectorStyle = { 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '8px' 
};
const commandSelectRowStyle = { 
  display: 'flex', 
  alignItems: 'center' 
};
const commandSelectStyle = {
  padding: '8px',
  marginRight: '8px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  flex: 1
};
const addCommandButtonStyle = {
  padding: '8px 12px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};
const commandsListStyle = { 
  maxHeight: '200px', 
  overflowY: 'auto', 
  border: '1px solid #eee', 
  borderRadius: '4px' 
};
const commandItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px',
  borderBottom: '1px solid #eee'
};
const commandDescriptionStyle = { 
  color: '#666', 
  fontSize: '0.9em' 
};
const deleteCommandButtonStyle = {
  padding: '4px 8px',
  backgroundColor: '#ffebee',
  color: '#c62828',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};
const saveButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#2196F3',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginTop: '8px'
};
const buttonSelectionStyle = {
  marginTop: '8px',
  padding: '8px',
  backgroundColor: '#f8f8f8',
  border: '1px solid #ddd',
  borderRadius: '4px'
};
const cancelButtonSelectionStyle = {
  marginLeft: '8px',
  padding: '4px 8px',
  backgroundColor: '#f44336',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};
const togglePanelButtonStyle = {
  padding: '8px 8px',
  marginLeft: '8px',
  backgroundColor: '#f0f0f0',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
  minWidth: '30px'
};

// Node Info Panel Styles
const nodeInfoPanelStyle = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: 'white',
  padding: '15px',
  borderRadius: '4px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  width: '300px',
  maxHeight: '80vh',
  overflowY: 'auto',
  zIndex: 10
};

const nodeInfoHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '15px',
  borderBottom: '1px solid #eee',
  paddingBottom: '10px'
};

const nodeInfoTitleStyle = {
  margin: '0 0 10px 0',
  color: '#333'
};

const nodeInfoSectionStyle = {
  marginBottom: '10px'
};

const nodeInfoLabelStyle = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '3px',
  color: '#555',
  fontSize: '0.9em'
};

const nodeInfoValueStyle = {
  padding: '5px',
  backgroundColor: '#f9f9f9',
  borderRadius: '3px',
  wordBreak: 'break-word'
};

const nodeInfoListStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0
};

const nodeInfoListItemStyle = {
  padding: '5px 0',
  borderBottom: '1px solid #eee',
  display: 'flex',
  justifyContent: 'space-between'
};

const nodeInfoButtonTextStyle = {
  fontWeight: '500'
};

const nodeInfoButtonActionStyle = {
  color: '#4CAF50',
  fontWeight: '500'
};

const nodeActionsStyle = {
  marginTop: '15px',
  paddingTop: '10px',
  borderTop: '1px solid #eee'
};

const deleteButtonStyle = {
  padding: '8px 12px',
  backgroundColor: '#ffebee',
  color: '#c62828',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  width: '100%'
};

export default React.memo(FlowBuilder);