import React, { useState, useEffect } from 'react';
import { Button, Drawer, Tag, Modal } from 'antd';
import { WarningOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import styles from './index.less';

export interface WarnningInfo {
  id: number;
  create_at: string;
  type: string;
  msg: string;
  chain: string;
  delete?: boolean;
}

interface WarningFloatProps {
  warnings: WarnningInfo[];
  onWarningDelete?: (id: number) => void;
}

export const WarningFloat: React.FC<WarningFloatProps> = ({ warnings, onWarningDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.type === 'admin';
  if (!isAdmin) return null;

  const [visible, setVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<WarnningInfo | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewWarning, setPreviewWarning] = useState<WarnningInfo | null>(null);

  const handleWarningClick = (warning: WarnningInfo) => {
    setSelectedWarning(warning);
    setDrawerVisible(true);
  };

  const handleDeleteWarning = async (id: number) => {
    // console.log(`开始删除预警 ${id}`);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`/api/warning/${id}`, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        // console.log(`预警 ${id} 删除成功`);
        if (onWarningDelete) {
          onWarningDelete(id);
        }
      } else {
        console.error(`预警 ${id} 删除失败:`, response.status);
      }
    } catch (error) {
      console.error('删除预警失败:', error);
    }
  };

  const filteredWarnings = warnings.filter(w => !w.delete);

  return (
    <>
      <div className={styles.warningFloat} style={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        zIndex: 1000,
        width: 'auto',
        maxWidth: '90%'
      }}>
        <Button
          type="primary"
          danger
          icon={<WarningOutlined />}
          onClick={() => setVisible(!visible)}
          style={{ 
            borderRadius: '20px',
            height: '40px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {filteredWarnings.length} 个预警
        </Button>
        {visible && (
          <div style={{ 
            position: 'absolute', 
            bottom: '50px', 
            right: 0,
            width: '300px',
            maxHeight: '75vh',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 500 }}>预警列表</span>
              <Button 
                type="text" 
                icon={<CloseOutlined />} 
                onClick={() => setVisible(false)}
                style={{ padding: '4px' }}
              />
            </div>
            <div style={{ 
              overflowY: 'auto',
              flex: 1,
              maxHeight: 'calc(75vh - 45px)'
            }}>
              {filteredWarnings.map((warning, index) => (
                <div
                  key={index}
                  onClick={() => handleWarningClick(warning)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: warning.type.includes('异常') ? '#fff1f0' : '#fffbe6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <Tag color={warning.type.includes('异常') ? 'red' : 'orange'}>
                        {warning.type}
                      </Tag>
                      <span style={{ color: '#888', fontSize: '12px' }}>
                        {dayjs(warning.create_at).format('MM-DD HH:mm')}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '14px',
                      color: '#333',
                      marginBottom: '4px',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '4.2em',
                      overflow: 'auto'
                    }}>
                      {warning.msg && warning.msg.length > 40 ? warning.msg.slice(0, 40) + '...' : warning.msg}
                    </div>
                  </div>
                  <Button 
                    type="text" 
                    icon={<DeleteOutlined />} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWarning(warning.id);
                    }}
                    style={{ padding: '4px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Drawer
        title="预警详情"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width="100%"
        style={{ 
          position: 'absolute',
          height: '75vh',
          top: '25vh'
        }}
      >
        {selectedWarning && (
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Tag color={selectedWarning.type.includes('异常') ? 'red' : 'orange'} style={{ marginBottom: '8px' }}>
                {selectedWarning.type}
              </Tag>
              <div style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
                {dayjs(selectedWarning.create_at).format('YYYY-MM-DD HH:mm:ss')}
              </div>
              <div style={{ 
                fontSize: '16px',
                color: '#333',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedWarning.msg}
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <Modal
        open={!!previewWarning}
        title={previewWarning?.type || '预警详情'}
        onCancel={() => setPreviewWarning(null)}
        footer={null}
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '90vw' : 520}
      >
        <div style={{ fontSize: 15, color: '#333', marginBottom: 12 }}>
          {previewWarning && previewWarning.msg
            ? (previewWarning.msg.length > 100
                ? previewWarning.msg.slice(0, 100) + '...'
                : previewWarning.msg)
            : ''}
        </div>
      </Modal>
    </>
  );
}; 