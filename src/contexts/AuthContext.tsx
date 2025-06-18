import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthContextType, LoginCredentials, User } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 尝试用token自动登录
  useEffect(() => {
    const autoLogin = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
          // 使用任意需要认证的接口来验证 token
          const res = await fetch('/api/trade/search', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            // token 有效，从本地存储获取用户信息
      const username = localStorage.getItem('username');
      const type = localStorage.getItem('userType') as User['type'];
      if (username && type) {
        setUser({ username, type });
      }
          } else {
            // token 无效，清除本地存储
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('userType');
          }
        } catch (error) {
          console.error('Auto login failed:', error);
          // 发生错误时也清除本地存储
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userType');
        }
      }
      setLoading(false);
    };
    autoLogin();
  }, []);

  // 登录：请求后端，拿到token和用户名
  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', credentials.username);
      localStorage.setItem('userType', data.type);
      setUser({ username: credentials.username, type: data.type });
    } else {
      throw new Error(data.error || '登录失败');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userType');
  }, []);

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.type === 'admin',
    loading
  };

  if (loading) {
    return <div>Loading...</div>; // 或者返回一个加载组件
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 