import { useState, useEffect } from 'react';

interface ActiveUser {
  id: string;
  username: string;
  color: string;
  position: { x: number; y: number };
  connectedAt: number;
  lastActivity: number;
}

interface SystemMetrics {
  activeUsers: number;
  totalConnections: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

interface HealthStatus {
  status: string;
  uptime: number;
  activeUsers: number;
  redis: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<ActiveUser[]>([]);
  // const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Listen for Ctrl+Shift+A to open admin dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  const authToken = localStorage.getItem('admin-token');

  useEffect(() => {
    if (authToken) {
      setIsAuthenticated(true);
    }
  }, [authToken]);

  const handleLogin = () => {
    if (password) {
      localStorage.setItem('admin-token', password);
      setIsAuthenticated(true);
      setPassword('');
      fetchData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin-token');
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('admin-token');

      // Fetch users
      const usersRes = await fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!usersRes.ok) {
        if (usersRes.status === 401 || usersRes.status === 403) {
          handleLogout();
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      // Fetch metrics
      const metricsRes = await fetch(`${backendUrl}/api/admin/metrics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        // setMetrics(metricsData.metrics);
      }

      // Fetch health
      const healthRes = await fetch(`${backendUrl}/api/admin/health`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData.health);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleKickUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to kick ${username}?`)) return;

    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`${backendUrl}/api/admin/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, reason: 'Kicked by administrator' }),
      });

      if (res.ok) {
        alert('User kicked successfully');
        fetchData();
      } else {
        throw new Error('Failed to kick user');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to kick user');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;

    try {
      const token = localStorage.getItem('admin-token');
      const res = await fetch(`${backendUrl}/api/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: broadcastMessage }),
      });

      if (res.ok) {
        alert('Message broadcast successfully');
        setBroadcastMessage('');
      } else {
        throw new Error('Failed to broadcast message');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to broadcast message');
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border-2 border-red-500">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-red-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
              <p className="text-sm text-red-400">Virtual Dev Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={fetchData}
                disabled={loading}
                className="text-gray-400 hover:text-white transition-colors p-2"
                title="Refresh"
              >
                <svg
                  className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isAuthenticated ? (
            <div className="max-w-md mx-auto mt-20">
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Admin Authentication</h3>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleLogin}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Login
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Default password: admin123
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-100 rounded-lg p-3 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Health Status */}
              {health && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-2xl font-bold text-white capitalize">{health.status}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Active Users</p>
                    <p className="text-2xl font-bold text-white">{health.activeUsers}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Uptime</p>
                    <p className="text-xl font-bold text-white">{formatUptime(health.uptime)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Memory Usage</p>
                    <p className="text-xl font-bold text-white">
                      {health.memory.used}MB / {health.memory.total}MB ({health.memory.percentage}%)
                    </p>
                  </div>
                </div>
              )}

              {/* Broadcast */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Broadcast Message</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter message to broadcast to all users"
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={handleBroadcast}
                    disabled={!broadcastMessage.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Broadcast
                  </button>
                </div>
              </div>

              {/* Active Users */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Active Users ({users.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                      <tr>
                        <th className="px-4 py-2">Username</th>
                        <th className="px-4 py-2">ID</th>
                        <th className="px-4 py-2">Position</th>
                        <th className="px-4 py-2">Connected</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                            No active users
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="border-b border-gray-700">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: user.color }}
                                />
                                <span className="text-white">{user.username}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                              {user.id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              ({Math.round(user.position.x)}, {Math.round(user.position.y)})
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              {new Date(user.connectedAt).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleKickUser(user.id, user.username)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
                              >
                                Kick
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAuthenticated && (
          <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              Press <kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+Shift+A</kbd> to open/close dashboard
            </p>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
