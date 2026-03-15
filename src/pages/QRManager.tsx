import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Plus, 
  Trash2, 
  Download, 
  Building2, 
  MapPin,
  ExternalLink,
  Printer,
  Info
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { v4 as uuidv4 } from 'uuid';
import { toPng } from 'html-to-image';

export default function QRManager() {
  const { clients, updateClient, companyLogo, companyData } = useStore();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [qrSize, setQrSize] = useState(200);
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newLocationName.trim()) return;

    const newLocation = {
      id: uuidv4(),
      name: newLocationName.trim()
    };

    const updatedLocations = [...(selectedClient.locations || []), newLocation];
    updateClient(selectedClientId, { ...selectedClient, locations: updatedLocations });
    setNewLocationName('');
    setIsModalOpen(false);
  };

  const handleDeleteLocation = (locationId: string) => {
    if (!selectedClient) return;
    if (!window.confirm('Tem certeza que deseja excluir este local?')) return;
    const updatedLocations = (selectedClient.locations || []).filter(l => l.id !== locationId);
    updateClient(selectedClientId, { ...selectedClient, locations: updatedLocations });
  };

  const downloadQRCode = async (locationId: string, locationName: string) => {
    const element = document.getElementById(`print-template-${locationId}`);
    if (!element) return;

    setIsGenerating(true);
    try {
      // Wait a bit for images to load if they are dynamic
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `QR-${selectedClient?.name}-${locationName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating QR image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Construct the public URL for the ticket form
  const getPublicUrl = (clientId: string, locationId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/report?client=${clientId}&location=${locationId}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <QrCode className="w-8 h-8 text-primary" />
            Gestão de QR Codes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gere códigos QR para locais específicos do condomínio para abertura rápida de chamados.
          </p>
        </div>

        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all min-w-[250px]"
        >
          <option value="">Selecionar Cliente/Condomínio</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </div>

      {!selectedClientId ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Selecione um cliente</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Escolha um condomínio para gerenciar os pontos de acesso via QR Code.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Locais em {selectedClient?.name}
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Local
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              O botão <strong>"Baixar Placa"</strong> gera uma imagem profissional com a logo da sua empresa, o nome do local e instruções para o usuário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedClient?.locations || []).map(loc => (
              <div key={loc.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Hidden Template for Image Generation */}
                  <div className="fixed -left-[9999px] top-0">
                    <div 
                      id={`print-template-${loc.id}`}
                      className="w-[600px] bg-white p-10 flex flex-col items-center text-center border-[12px] border-primary"
                    >
                      {companyLogo && (
                        <img 
                          src={companyLogo} 
                          alt="Logo" 
                          className="h-24 object-contain mb-6"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter mb-2">
                        {companyData?.name || 'IA COMPANY TEC'}
                      </h2>
                      <div className="w-24 h-1.5 bg-primary mb-8" />
                      
                      <div className="bg-zinc-100 px-6 py-3 rounded-full mb-8">
                        <span className="text-xl font-bold text-zinc-600 uppercase tracking-widest">
                          {selectedClient?.name}
                        </span>
                      </div>

                      <h1 className="text-5xl font-black text-zinc-900 mb-4 tracking-tight">
                        {loc.name}
                      </h1>
                      
                      <div className="p-6 bg-white border-4 border-zinc-100 rounded-[40px] shadow-xl mb-8">
                        <QRCodeSVG 
                          value={getPublicUrl(selectedClientId, loc.id)}
                          size={300}
                          level="H"
                          includeMargin={false}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-zinc-900">
                          PROBLEMAS NESTE LOCAL?
                        </p>
                        <p className="text-xl text-zinc-500 font-medium">
                          Escaneie o código acima para abrir um chamado
                        </p>
                      </div>

                      <div className="mt-12 pt-8 border-t border-zinc-100 w-full flex justify-between items-center text-zinc-400 font-bold text-sm uppercase tracking-widest">
                        <span>SISTEMA IA COMPANY TEC</span>
                        <span>{new Date().getFullYear()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-inner flex justify-center items-center overflow-hidden">
                    <QRCodeSVG 
                      id={`qr-${loc.id}`}
                      value={getPublicUrl(selectedClientId, loc.id)}
                      size={150}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold">{loc.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 break-all px-4">
                      {getPublicUrl(selectedClientId, loc.id)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full pt-4">
                    <button
                      onClick={() => downloadQRCode(loc.id, loc.name)}
                      disabled={isGenerating}
                      className="w-full py-3 rounded-xl bg-primary text-white hover:bg-primary-hover transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Printer className="w-5 h-5" />
                      )}
                      Baixar Placa (Logo)
                    </button>
                    
                    <div className="flex items-center gap-2 w-full">
                      <a
                        href={getPublicUrl(selectedClientId, loc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-bold"
                        title="Testar Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Testar
                      </a>
                      <button
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white transition-all text-red-500"
                        title="Excluir Local"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(selectedClient?.locations || []).length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl">
                <p className="text-gray-400">Nenhum local cadastrado. Adicione o primeiro local para gerar QR Codes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Local para QR Code"
        maxWidth="sm"
      >
        <form onSubmit={handleAddLocation} className="space-y-4 p-2">
          <div>
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Nome do Local</label>
            <input
              required
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="Ex: Elevador Social 1, Salão de Festas, Garagem G1..."
              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 text-gray-500 font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-xl font-bold transition-all"
            >
              Adicionar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
