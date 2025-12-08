import React, { useState, useMemo } from 'react';
import { Client, DocumentFile, Material } from '../types';
import { Layout } from './Layout';
import { FileText, Download, Calendar, Search, File, User, Clock, CheckCircle, Package } from 'lucide-react';

interface ClientDashboardProps {
  client: Client;
  allClients: Client[]; // Needed to look up names of other clients
  documents: DocumentFile[];
  onLogout: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ client, allClients, documents, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = documents.filter(doc => 
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (doc: DocumentFile) => {
    // In a real app, this would be a fetch to a secure URL.
    const link = document.createElement('a');
    link.href = `data:${doc.mimeType};base64,${doc.fileData}`;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getClientName = (clientId: string) => {
    return allClients.find(c => c.id === clientId)?.name || 'Desconocido';
  };

  // --- Calculate Statistics ---
  const stats = useMemo(() => {
    let totalHours = 0;
    let resolvedCount = 0;
    const materialMap = new Map<string, number>();

    documents.forEach(doc => {
      if (doc.data) {
        // Hours
        totalHours += doc.data.hours || 0;
        
        // Resolved
        if (doc.data.isResolved) {
          resolvedCount++;
        }

        // Materials
        if (doc.data.materials && doc.data.materials.length > 0) {
          doc.data.materials.forEach((mat: Material) => {
            const current = materialMap.get(mat.name) || 0;
            materialMap.set(mat.name, current + mat.units);
          });
        }
      }
    });

    return {
      totalHours,
      resolvedCount,
      materials: Array.from(materialMap.entries()).map(([name, units]) => ({ name, units }))
    };
  }, [documents]);

  return (
    <Layout 
      title={`Área Privada: ${client.name}`} 
      subtitle="Accede a tus partes de trabajo, albaranes y estadísticas."
      onLogout={onLogout}
      userName={client.name}
    >
      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Horas Totales</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalHours} h</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Incidencias Resueltas</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.resolvedCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
           <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
             <Package size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">Productos Diferentes</p>
             <h3 className="text-2xl font-bold text-gray-900">{stats.materials.length}</h3>
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Document List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-gray-900">Documentos</h3>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Buscar documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredDocs.length > 0 ? (
            <div className="space-y-4">
              {filteredDocs.map((doc) => {
                const isShared = doc.clientId !== client.id;
                return (
                  <div 
                    key={doc.id} 
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-all ${
                      isShared ? 'bg-indigo-50/20 border-indigo-100 hover:border-indigo-300' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3 sm:mb-0">
                      <div className={`p-2 rounded-lg ${isShared ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{doc.fileName}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="flex items-center text-xs text-gray-500 gap-1">
                            <Calendar size={12} />
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </span>
                          {isShared && (
                            <span className="flex items-center text-xs text-indigo-600 font-medium gap-1 bg-indigo-50 px-2 rounded-full">
                              <User size={12} />
                              {getClientName(doc.clientId)}
                            </span>
                          )}
                          {doc.data?.isResolved && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 rounded-full font-medium">Resuelto</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                    >
                      <Download size={16} />
                      <span className="sm:hidden">Descargar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto h-12 w-12 text-gray-300 mb-3">
                <File className="h-12 w-12" />
              </div>
              <p className="text-gray-500">No se encontraron documentos.</p>
            </div>
          )}
        </div>

        {/* Right Column: Materials Summary */}
        <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={20} className="text-indigo-600" />
            Material Usado
          </h3>
          
          {stats.materials.length > 0 ? (
            <div className="space-y-3">
              {stats.materials.map((mat, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{mat.name}</span>
                  <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                    {mat.units}
                  </span>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-8 text-gray-400 text-sm italic">
               No hay materiales registrados en los documentos actuales.
             </div>
          )}
        </div>

      </div>
    </Layout>
  );
};