export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  const token = localStorage.getItem('token');
  const headers = { ...(init?.headers || {}), Authorization: token ? `Bearer ${token}` : '' };
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/'; // 跳转欢迎页
    throw new Error('未登录或登录已过期');
  }
  return res;
} 