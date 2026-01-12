import React from 'react';
import { Handle, Position } from 'reactflow';
import ReactMarkdown from 'react-markdown';

const PostNode = ({ id, data, selected }) => {
  const handleChange = (field, value) => {
    if (data?.onChange) {
      data.onChange(id, { [field]: value });
    }
  };

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  const handleAddImageUrl = () => {
    const newUrl = prompt('Enter image URL:');
    if (newUrl) {
      const existingUrls = data.images ? data.images.split(',') : [];
      const newUrls = [...existingUrls, newUrl].join(',');
      handleChange('images', newUrls);
    }
  };

  const removeImage = (indexToRemove) => {
    const urls = data.images ? data.images.split(',') : [];
    const newUrls = urls.filter((_, index) => index !== indexToRemove).join(',');
    handleChange('images', newUrls);
  };

  return (
    <div style={{
      padding: '12px',
      borderRadius: '12px',
      backgroundColor: '#fff',
      border: '2px solid #48aae6',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '280px',
      maxWidth: '400px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <Handle type="target" position={Position.Left} 
        style={{
          width: '14px',
          height: '14px',
          backgroundColor: '#000000',
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)'
        }}/>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: '#48aae6',
          fontWeight: '600'
        }}>
          Telegram Post
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
        {/* Preview section */}
        <div style={{ 
          marginBottom: '12px',
          padding: '10px',
          border: '2px solid #f0f0f0',
          borderRadius: '4px',
          minHeight: '60px',
          maxHeight: '150px',
          overflowY: 'auto',
          backgroundColor: '#fafafa'
        }}>
          <ReactMarkdown>
            {data.content || '*Post content preview...*'}
          </ReactMarkdown>
          
          {data.images && (
            <div style={{ marginTop: '10px' }}>
              {data.images.split(',').map((img, index) => (
                img && (
                  <div key={index} style={{ 
                    marginBottom: '8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'relative',
                      height: '120px',
                      backgroundImage: `url(${img.trim()})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}>
                      <button 
                        onClick={() => removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: '#ff6b6b',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {data.captions && data.captions.split('|||')[index] && (
                      <div style={{
                        padding: '8px',
                        backgroundColor: '#f8f8f8',
                        fontSize: '12px',
                        borderTop: '1px solid #e0e0e0'
                      }}>
                        {data.captions.split('|||')[index]}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Content editor */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Post Content (Markdown):
          </label>
          <textarea
            value={data.content || ''}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="Write your post text here (supports Markdown)"
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              minHeight: '80px',
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}
          />
        </div>
        
        {/* Image URLs and Captions */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}>
            <label style={{ 
              fontWeight: '500',
              color: '#555'
            }}>
              Images:
            </label>
            <button
              onClick={handleAddImageUrl}
              style={{
                background: '#48aae6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Add Image URL
            </button>
          </div>
          
          {data.images && data.images.split(',').map((url, index) => (
            url.trim() && (
              <div key={index} style={{ 
                marginBottom: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '8px'
              }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '6px',
                  wordBreak: 'break-all'
                }}>
                  <span style={{ 
                    marginRight: '6px',
                    color: '#48aae6',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}.
                  </span>
                  <span>{url.trim()}</span>
                </div>
                
                <label style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Caption for this image:
                </label>
                <input
                  type="text"
                  value={data.captions ? (data.captions.split('|||')[index] || '') : ''}
                  onChange={(e) => {
                    const captions = data.captions ? data.captions.split('|||') : [];
                    captions[index] = e.target.value;
                    handleChange('captions', captions.join('|||'));
                  }}
                  placeholder="Text that will appear below the image"
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            )
          ))}
        </div>
        
        {/* Reactions */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Reactions:
          </label>
          <input
            type="text"
            value={data.reactions || ''}
            onChange={(e) => handleChange('reactions', e.target.value)}
            placeholder="👍,❤️,🔥 (comma separated)"
            style={{
              width: '93%',
              padding: '8px',
              border: '2px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          <div style={{ 
            display: 'flex',
            gap: '5px',
            marginTop: '8px',
            flexWrap: 'wrap'
          }}>
            {data.reactions && data.reactions.split(',').map((reaction, i) => (
              reaction.trim() && (
                <span key={i} style={{
                  fontSize: '18px',
                  padding: '2px 5px',
                  background: '#f0f0f0',
                  borderRadius: '4px'
                }}>
                  {reaction.trim()}
                </span>
              )
            ))}
          </div>
        </div>
        
        {/* Timing */}
        <div style={{ 
          borderTop: '2px solid #f0f0f0', 
          paddingTop: '10px' 
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: '500',
            color: '#555'
          }}>
            Send Timing:
          </label>
          <select
            value={data.delay || '0'}
            onChange={(e) => handleChange('delay', e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '4px',
              border: '2px solid #e0e0e0',
              fontSize: '12px'
            }}
          >
            <option value="0">Send immediately</option>
            <option value="300">After 5 minutes</option>
            <option value="1800">After 30 minutes</option>
            <option value="3600">After 1 hour</option>
          </select>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{
          width: '14px',
          height: '14px',
          backgroundColor: '#000000',
          border: '2px solid white',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
};

export default React.memo(PostNode);