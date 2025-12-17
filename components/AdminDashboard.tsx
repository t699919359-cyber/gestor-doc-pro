import React, { useState, useRef } from 'react';
import { Client, DocumentFile, AnalysisResult, ContractType } from '../types';
import { analyzeDocument } from '../services/geminiService';
import { Layout } from './Layout';
import { Users, FileText, Upload, RefreshCw, Eye, EyeOff, Plus, Trash2, Shield, X, Save, Clock, Pencil, Briefcase } from 'lucide-react';

interface AdminDashboardProps {
  clients: Client[];
  documents: DocumentFile[];
  onAddClient: (name: string) => Client;
  onEditClient: (id: string, newName: string, newContractType: ContractType) => void;
  onDeleteClient: (id: string) => void;
  onUpdatePermissions: (clientId: string, viewableIds: string[]) => void;
  onAddDocument: (doc: DocumentFile) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  documents,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onUpdatePermissions,
  onAddDocument,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'clients'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newClientName, setNewClientName] = useState('');
  
  // Permissions Modal State
  const [editingPermissionsClient, setEditingPermissionsClient] = useState<Client | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);

  // Edit Client Modal State
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editContractType, setEditContractType] = useState<ContractType>('sin_contrato');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const getContractLabel = (type?: ContractType) => {
    switch (type) {
      case 'pack_horas': return 'Pack por horas';
      case 'mensual': return 'Mensual';
      case 'sin_contrato': return 'Sin contrato';
      default: return 'Sin contrato';
    }
  };

  const getContractBadgeColor = (type?: ContractType) => {
    switch (type) {
      case 'pack_horas': return 'bg-orange-100 text-orange-800';
      case 'mensual': return 'bg-purple-100 text-purple-800';
      case 'sin_contrato': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadStatus('Iniciando procesamiento con IA...');

    const processedDocs: DocumentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`Analizando ${file.name} (${i + 1}/${files.length})...`);

      try {
        const base64 = await fileToBase64(file);
        
        // 1. Analyze with Gemini
        const analysis: AnalysisResult = await analyzeDocument(base64, file.type || 'application/pdf');
        
        let targetClient = clients.find(c => 
          c.name.toLowerCase().includes(analysis.clientName.toLowerCase()) || 
          analysis.clientName.toLowerCase().includes(c.name.toLowerCase())
        );

        // 2. Logic: If confidence is high but client doesn't exist, create it?
        if (!targetClient && analysis.clientName && analysis.clientName !== "Desconocido" && analysis.clientName !== "Error de lectura") {
           targetClient = onAddClient(analysis.clientName);
           setUploadStatus(`Nuevo cliente detectado: ${analysis.clientName}`);
        }

        if (targetClient) {
          const newDoc: DocumentFile = {
            id: crypto.randomUUID(),
            clientId: targetClient.id,
            fileName: file.name,
            uploadDate: new Date().toISOString(),
            fileData: base64,
            mimeType: file.type || 'application/pdf',
            status: 'assigned',
            data: analysis.data // Store the extracted technical data
          };
          onAddDocument(newDoc);
          processedDocs.push(newDoc);
        } else {
           console.warn("Could not match client for", file.name);
           setUploadStatus(`No se pudo identificar cliente para ${file.name}`);
        }

      } catch (err) {
        console.error("Error processing file", file.name, err);
      }
    }

    setIsProcessing(false);
    setUploadStatus(`Procesado completado. ${processedDocs.length} documentos asignados.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Clear status after 3 seconds
    setTimeout(() => setUploadStatus(''), 5000);
  };

  const togglePasswordVisibility = (clientId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const handleManualAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClientName.trim()) {
      onAddClient(newClientName.trim());
      setNewClientName('');
    }
  };

  // Edit Client Logic
  const openEditClientModal = (client: Client) => {
    setClientToEdit(client);
    setEditClientName(client.name);
    setEditContractType(client.contractType || 'sin_contrato');
  };

  const saveEditedClient = () => {
    if (clientToEdit && editClientName.trim()) {
      onEditClient(clientToEdit.id, editClientName.trim(), editContractType);
      setClientToEdit(null);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) {
      onDeleteClient(id);
    }
  };

  const openPermissionsModal = (client: Client) => {
    setEditingPermissionsClient(client);
    setTempPermissions(client.viewableClientIds || []);
  };

  const togglePermission = (targetId: string) => {
    setTempPermissions(prev => {
      if (prev.includes(targetId)) {
        return prev.filter(id => id !== targetId);
      } else {
        return [...prev, targetId];
      }
    });
  };

  const savePermissions = () => {
    if (editingPermissionsClient) {
      onUpdatePermissions(editingPermissionsClient.id, tempPermissions);
      setEditingPermissionsClient(null);
    }
  };

  return (
    <Layout 
      title="Panel de Administración" 
      subtitle="Gestiona clientes y sube documentación automatizada."
      onLogout={onLogout}
      userName="Administrador"
    >
      <div className="flex flex-col md:flex-row gap-6 relative">
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Upload size={18} />
            Subida Inteligente
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'clients' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users size={18} />
            Gestión de Clientes
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
          
          {activeTab === 'upload' && (
            <div className="space-y-8">
              <div className="text-center max-w-lg mx-auto mt-10">
                <div className="mx-auto h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-10 w-10 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Subir Partes y Albaranes</h3>
                <p className="text-gray-500 mt-2 text-sm">
                  Arrastra tus archivos PDF aquí o haz clic para seleccionar. 
                  El sistema leerá el contenido para asignarlo automáticamente al cliente correspondiente.
                </p>
                
                <div className="mt-8">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white transition-all shadow-lg cursor-pointer ${
                      isProcessing 
                        ? 'bg-indigo-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin h-5 w-5" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Seleccionar PDFs
                      </>
                    )}
                  </label>
                </div>

                {uploadStatus && (
                  <div className={`mt-6 p-4 rounded-lg text-sm font-medium ${isProcessing ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                    {uploadStatus}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Actividad Reciente</h4>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No hay documentos subidos aún.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.slice(0, 5).map(doc => {
                       const client = clients.find(c => c.id === doc.clientId);
                       return (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{doc.fileName}</span>
                              <span className="text-xs text-gray-500">Asignado a: <span className="text-indigo-600 font-medium">{client?.name || 'Desconocido'}</span></span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        </div>
                       );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Listado de Clientes</h3>
                <form onSubmit={handleManualAddClient} className="flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nuevo Cliente..."
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Docs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acceso</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contraseña</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map(client => {
                      const docCount = documents.filter(d => d.clientId === client.id).length;
                      return (
                        <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3">
                                {client.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{client.name}</span>
                                {(client.viewableClientIds?.length || 0) > 0 && (
                                  <span className="text-xs text-indigo-600 font-medium">Super Cliente</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {docCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getContractBadgeColor(client.contractType)}`}>
                              {getContractLabel(client.contractType)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.lastLogin ? (
                              <div className="flex flex-col">
                                <span className="text-gray-900 font-medium">{new Date(client.lastLogin).toLocaleDateString()}</span>
                                <span className="text-xs text-gray-400">{new Date(client.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic flex items-center gap-1">
                                <Clock size={12} /> Nunca
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                                {showPasswords[client.id] ? client.password : '••••••••'}
                              </code>
                              <button 
                                onClick={() => togglePasswordVisibility(client.id)}
                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                {showPasswords[client.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => openEditClientModal(client)}
                                title="Editar Cliente"
                                className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => openPermissionsModal(client)}
                                title="Gestionar Permisos de Visualización"
                                className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                              >
                                <Shield size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(client.id, client.name)}
                                title="Eliminar Cliente"
                                className="text-red-500 hover:text-red-700 font-medium transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">
                          No hay clientes registrados. Sube un documento para crear uno automáticamente o añádelo manualmente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Edit Client Modal */}
        {clientToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Editar Cliente</h3>
                <button 
                  onClick={() => setClientToEdit(null)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cliente</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-gray-400" />
                     </div>
                    <input
                      type="text"
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      placeholder="Nombre empresa"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Contrato</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={editContractType}
                      onChange={(e) => setEditContractType(e.target.value as ContractType)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm bg-white"
                    >
                      <option value="sin_contrato">Sin contrato</option>
                      <option value="pack_horas">Pack por horas</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setClientToEdit(null)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEditedClient}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {editingPermissionsClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Gestionar Acceso</h3>
                  <p className="text-xs text-gray-500">Permitir a {editingPermissionsClient.name} ver documentos de:</p>
                </div>
                <button 
                  onClick={() => setEditingPermissionsClient(null)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="space-y-3">
                  {clients.filter(c => c.id !== editingPermissionsClient.id).map(targetClient => (
                    <div 
                      key={targetClient.id}
                      onClick={() => togglePermission(targetClient.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        tempPermissions.includes(targetClient.id)
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                           tempPermissions.includes(targetClient.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                        }`}>
                          {tempPermissions.includes(targetClient.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{targetClient.name}</span>
                      </div>
                    </div>
                  ))}
                  {clients.length <= 1 && (
                    <p className="text-sm text-gray-500 italic text-center py-4">
                      No hay otros clientes disponibles para asignar.
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setEditingPermissionsClient(null)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePermissions}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
                >
                  <Save size={16} />
                  Guardar Permisos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};