import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  Building2, 
  ClipboardList, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  Download,
  Save,
  Search,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { Modal } from '../components/Modal';

export default function PreventiveReport() {
  const navigate = useNavigate();
  const { clients, checklistItems, companyData, companyLogo, addChecklistItem } = useStore();
  
  const [step, setStep] = useState<'client' | 'checklist'>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [results, setResults] = useState<Record<string, { status: 'OK' | 'NOK' | 'NA', notes: string }>>({});
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ task: '', category: '' });

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const filteredChecklistItems = useMemo(() => {
    return checklistItems.filter(item => {
      const itemClientIds = item.clientIds || (item.clientId ? [item.clientId] : []);
      return itemClientIds.length === 0 || itemClientIds.includes(selectedClientId);
    });
  }, [checklistItems, selectedClientId]);

  const categories = useMemo(() => {
    return Array.from(new Set(filteredChecklistItems.map(item => item.category)));
  }, [filteredChecklistItems]);

  // Sync results with filteredChecklistItems when they change (e.g. when a new task is added)
  React.useEffect(() => {
    if (step === 'checklist') {
      setResults(prev => {
        const newResults = { ...prev };
        let changed = false;
        filteredChecklistItems.forEach(item => {
          if (!newResults[item.id]) {
            newResults[item.id] = { status: 'OK', notes: '' };
            changed = true;
          }
        });
        return changed ? newResults : prev;
      });
    }
  }, [filteredChecklistItems, step]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.task || !newTask.category) return;

    addChecklistItem({
      task: newTask.task,
      category: newTask.category,
      clientIds: [selectedClientId]
    });

    setNewTask({ task: '', category: '' });
    setIsAddTaskModalOpen(false);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    // Initialize results
    const initialResults: Record<string, { status: 'OK' | 'NOK' | 'NA', notes: string }> = {};
    checklistItems.forEach(item => {
      const itemClientIds = item.clientIds || (item.clientId ? [item.clientId] : []);
      if (itemClientIds.length === 0 || itemClientIds.includes(clientId)) {
        initialResults[item.id] = { status: 'OK', notes: '' };
      }
    });
    setResults(initialResults);
    setStep('checklist');
  };

  const generatePDF = () => {
    if (!selectedClient) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    if (companyLogo) {
      try {
        doc.addImage(companyLogo, 'PNG', 15, 15, 30, 30);
      } catch (e) {
        console.error('Error adding logo to PDF', e);
      }
    }

    doc.setFontSize(20);
    doc.setTextColor(0, 74, 124); // Primary color
    doc.text('RELATÓRIO DE MANUTENÇÃO PREVENTIVA', 50, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(companyData?.name || 'IA COMPANY TEC', 50, 32);
    doc.text(`${companyData?.address || ''}`, 50, 37);
    doc.text(`Tel: ${companyData?.phone || ''} | Email: ${companyData?.email || ''}`, 50, 42);

    // Divider
    doc.setDrawColor(200);
    doc.line(15, 50, pageWidth - 15, 50);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DO CONDOMÍNIO', 15, 60);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Condomínio: ${selectedClient.name}`, 15, 67);
    doc.text(`Endereço: ${selectedClient.address}`, 15, 72);
    doc.text(`Data da Manutenção: ${new Date(date).toLocaleDateString('pt-BR')}`, 15, 77);
    doc.text(`Técnico Responsável: ${technicianName || 'Não informado'}`, 15, 82);

    // Checklist Table
    const tableData = filteredChecklistItems.map(item => [
      item.category,
      item.task,
      results[item.id]?.status || 'OK',
      results[item.id]?.notes || '-'
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Categoria', 'Tarefa', 'Status', 'Observações']],
      body: tableData,
      headStyles: { fillColor: [0, 74, 124], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 90 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 50 }
      }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    doc.line(15, finalY, 90, finalY);
    doc.text('Assinatura do Técnico', 15, finalY + 5);
    
    doc.line(120, finalY, pageWidth - 15, finalY);
    doc.text('Assinatura do Responsável / Zelador', 120, finalY + 5);

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado por IA COMPANY TEC em ${new Date().toLocaleString('pt-BR')}`, 15, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Preventiva-${selectedClient.name}-${date}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#004a7c] text-white -m-8 p-8 md:p-12 overflow-x-hidden relative flex flex-col">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,1000 C300,800 400,900 1000,600 L1000,1000 L0,1000 Z" fill="white" fillOpacity="0.1" />
          <path d="M0,800 C200,600 500,700 1000,400 L1000,800 L0,800 Z" fill="white" fillOpacity="0.05" />
        </svg>
      </div>

      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => step === 'checklist' ? setStep('client') : navigate('/')}
            className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white border border-white/10 backdrop-blur-md shadow-xl active:scale-95"
          >
            <ArrowLeft className="w-8 h-8" />
          </button>
          <div>
            <h1 className="text-6xl font-light tracking-tight">
              Checklist Inteligente
            </h1>
            <p className="text-xl opacity-60 mt-2 font-light">
              {step === 'client' ? 'Selecione o Condomínio' : `Preventiva: ${selectedClient?.name}`}
            </p>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'client' ? (
          <motion.div 
            key="step-client"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col relative z-10"
          >
            <div className="max-w-2xl mx-auto w-full mb-12">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30 group-focus-within:text-white transition-colors" />
                <input 
                  type="text"
                  placeholder="Pesquisar condomínio por nome ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-[2rem] pl-16 pr-8 py-6 outline-none transition-all text-xl text-white placeholder:text-white/20 backdrop-blur-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client.id)}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 text-left hover:bg-white/10 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Building2 className="w-24 h-24" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{client.name}</h3>
                    <p className="text-white/40 text-sm line-clamp-2 mb-8">{client.address}</p>
                    
                    <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                      Selecionar <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredClients.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40">
                <Building2 className="w-20 h-20 mb-4" />
                <p className="text-xl">Nenhum condomínio encontrado</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="step-checklist"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col relative z-10 max-w-5xl mx-auto w-full pb-20"
          >
            {/* Technician Info */}
            <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-10 mb-10 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-white/30 ml-1">Técnico Responsável</label>
                <input 
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-2xl px-6 py-4 outline-none transition-all text-white text-lg"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-white/30 ml-1">Data da Manutenção</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-2xl px-6 py-4 outline-none transition-all text-white text-lg"
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-12">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-bold">Itens de Verificação</h2>
                <button 
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" /> Nova Tarefa
                </button>
              </div>

              {categories.map(category => (
                <div key={category} className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white/20 border-b border-white/5 pb-4 ml-4">
                    {category}
                  </h3>
                  <div className="space-y-4">
                    {filteredChecklistItems.filter(item => item.category === category).map(item => (
                      <div key={item.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-all group">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                          <div className="flex-1">
                            <h4 className="text-xl font-bold mb-2">{item.task}</h4>
                            <p className="text-white/30 text-sm">Verifique as condições gerais e funcionamento.</p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5">
                              {[
                                { id: 'OK', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
                                { id: 'NOK', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/20' },
                                { id: 'NA', icon: MinusCircle, color: 'text-white/40', bg: 'bg-white/10' }
                              ].map(status => (
                                <button
                                  key={status.id}
                                  type="button"
                                  onClick={() => setResults(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], status: status.id as any }
                                  }))}
                                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-black text-xs tracking-widest ${
                                    results[item.id]?.status === status.id 
                                      ? `${status.bg} ${status.color} shadow-lg` 
                                      : 'text-white/20 hover:text-white/40'
                                  }`}
                                >
                                  <status.icon className="w-4 h-4" />
                                  {status.id}
                                </button>
                              ))}
                            </div>

                            <input 
                              type="text"
                              placeholder="Observações..."
                              value={results[item.id]?.notes || ''}
                              onChange={(e) => setResults(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], notes: e.target.value }
                              }))}
                              className="w-full lg:w-64 bg-black/20 border border-white/5 focus:border-white/20 rounded-2xl px-5 py-3.5 text-sm outline-none transition-all text-white placeholder:text-white/10"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="fixed bottom-12 right-12 flex gap-4 z-50">
              <button
                onClick={() => navigate('/')}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-black tracking-widest border border-white/10 backdrop-blur-md transition-all active:scale-95 shadow-2xl uppercase text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={generatePDF}
                className="bg-white text-[#004a7c] px-10 py-4 rounded-2xl font-black tracking-widest transition-all active:scale-95 shadow-2xl flex items-center gap-3 uppercase text-xs"
              >
                <Download className="w-5 h-5" /> Exportar PDF
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Adicionar Nova Tarefa"
        maxWidth="md"
        glass
      >
        <form onSubmit={handleAddTask} className="space-y-6 p-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-2 ml-1">Descrição da Tarefa *</label>
            <input 
              required
              type="text" 
              value={newTask.task}
              onChange={e => setNewTask({...newTask, task: e.target.value})}
              className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 outline-none transition-all text-white placeholder:text-white/30"
              placeholder="Ex: Verificar iluminação de emergência"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-white/30 mb-2 ml-1">Categoria *</label>
            <input 
              required
              type="text" 
              list="report-categories"
              value={newTask.category}
              onChange={e => setNewTask({...newTask, category: e.target.value})}
              className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 outline-none transition-all text-white placeholder:text-white/30"
              placeholder="Ex: Elétrica, Hidráulica, Segurança..."
            />
            <datalist id="report-categories">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsAddTaskModalOpen(false)}
              className="px-6 py-3 text-white/60 hover:text-white transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-white text-[#004a7c] px-10 py-3 rounded-xl font-bold transition-all active:scale-95"
            >
              ADICIONAR
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
