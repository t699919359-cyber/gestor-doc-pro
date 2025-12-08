import React, { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { AuthState, Client, DocumentFile, UserRole } from './types';
import { Lock, User, ArrowRight } from 'lucide-react';

// --- Helper for generating secure-looking passwords ---
const generatePassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// --- Initial Mock Data ---
const INITIAL_CLIENTS: Client[] = [
  { id: '1', name: 'Construcciones S.A.', password: generatePassword(), viewableClientIds: [] },
  { id: '2', name: 'Talleres Mecánicos Paco', password: generatePassword(), viewableClientIds: [] },
];

const App: React.FC = () => {
  // --- State ---
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, role: null });
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  
  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Can be 'admin' or client name
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Admin Login Check
    if (loginIdentifier.toLowerCase() === 'admin' && loginPassword === 'admin123') {
      setAuth({ isAuthenticated: true, role: UserRole.ADMIN });
      return;
    }

    // Client Login Check
    const client = clients.find(c => c.name.toLowerCase() === loginIdentifier.toLowerCase());
    if (client && client.password === loginPassword) {
      // Update lastLogin timestamp
      const now = new Date().toISOString();
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, lastLogin: now } : c));

      setAuth({ isAuthenticated: true, role: UserRole.CLIENT, clientId: client.id });
      return;
    }

    setLoginError('Credenciales incorrectas. Inténtalo de nuevo.');
  };

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, role: null, clientId: undefined });
    setLoginIdentifier('');
    setLoginPassword('');
    setLoginError('');
  };

  const handleAddClient = (name: string): Client => {
    // Check if exists
    const existing = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: name,
      password: generatePassword(),
      viewableClientIds: []
    };
    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    // Optionally remove documents associated with this client
    // setDocuments(prev => prev.filter(d => d.clientId !== id)); 
    // For now, we keep documents or they become orphaned (unassigned) visually in admin view
  };

  const handleUpdatePermissions = (clientId: string, viewableIds: string[]) => {
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, viewableClientIds: viewableIds } : c
    ));
  };

  const handleAddDocument = (doc: DocumentFile) => {
    setDocuments(prev => [doc, ...prev]);
  };

  // --- Render ---

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 px-8 py-10 text-center">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">GestorDoc Pro</h2>
            <p className="mt-2 text-indigo-100">Portal de Partes y Albaranes</p>
          </div>
          
          <div className="px-8 py-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario / Nombre Cliente</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Ej. Admin o Nombre de Empresa"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Acceder
                <ArrowRight size={16} />
              </button>
            </form>
            
            <div className="mt-6 text-center text-xs text-gray-400">
              <p>Demo Login Admin: <strong>admin</strong> / <strong>admin123</strong></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  if (auth.role === UserRole.ADMIN) {
    return (
      <AdminDashboard
        clients={clients}
        documents={documents}
        onAddClient={handleAddClient}
        onDeleteClient={handleDeleteClient}
        onUpdatePermissions={handleUpdatePermissions}
        onAddDocument={handleAddDocument}
        onLogout={handleLogout}
      />
    );
  }

  // Client View
  if (auth.role === UserRole.CLIENT && auth.clientId) {
    const client = clients.find(c => c.id === auth.clientId);
    
    // Logic for Super Clients: Can see their own + viewableClientIds
    const viewableIds = [auth.clientId, ...(client?.viewableClientIds || [])];
    const viewableDocs = documents.filter(d => viewableIds.includes(d.clientId));
    
    if (client) {
      return (
        <ClientDashboard
          client={client}
          allClients={clients}
          documents={viewableDocs}
          onLogout={handleLogout}
        />
      );
    }
  }

  return <div>Error de estado. Por favor recarga.</div>;
};

export default App;