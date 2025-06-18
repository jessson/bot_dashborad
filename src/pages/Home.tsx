import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from '../components/LoginModal';
import TransactionList from './TransactionList';
import { WelcomePage } from './WelcomePage';

function isMobile() {
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const Home: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const mobile = isMobile();

  useEffect(() => {
    if (!isAuthenticated) setLoginModalOpen(false);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <>
        <WelcomePage onLoginClick={() => setLoginModalOpen(true)} isMobile={mobile} />
        <LoginModal 
          open={loginModalOpen} 
          onClose={() => setLoginModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <>
      {!mobile && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 24,
            zIndex: 2000,
          }}
        >
          <Button onClick={logout} size="small">
            退出
          </Button>
        </div>
      )}
      <TransactionList />
    </>
  );
};

export default Home; 