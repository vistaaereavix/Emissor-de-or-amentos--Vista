import React, { useState, useEffect } from 'react';
import { CompanySettings, Cliente, Produto, Orcamento } from './types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CLIENTS,
  INITIAL_PRODUCTS,
  INITIAL_BUDGETS,
} from './utils/initialData';

import CompanySettingsForm from './components/CompanySettingsForm';
import ClientRegistration from './components/ClientRegistration';
import ProductRegistration from './components/ProductRegistration';
import BudgetGenerator from './components/BudgetGenerator';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import BudgetPreviewModal from './components/BudgetPreviewModal';
import { gerarOrcamentoPDF } from './utils/pdfGenerator';

import { FileText, Users, ShoppingBag, Building, Cpu, RefreshCw, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orcamentos' | 'clientes' | 'produtos' | 'empresa'>('dashboard');

  // Dashboard shortcut navigation states
  const [initialIsGeneratingBudget, setInitialIsGeneratingBudget] = useState(false);
  const [initialIsAddingClient, setInitialIsAddingClient] = useState(false);
  const [initialIsAddingProduct, setInitialIsAddingProduct] = useState(false);
  const [dashboardPreviewOrcamento, setDashboardPreviewOrcamento] = useState<Orcamento | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<{ email: string; isGuest?: boolean } | null>(() => {
    const saved = localStorage.getItem('vista_aerea_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return null;
      }
    }
    return null;
  });

  // Core App States
  const [dbLoading, setDbLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [empresa, setEmpresa] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Sincronização inicial - APENAS LOCALSTORAGE (Sincronização automática DESABILITADA)
  useEffect(() => {
    async function loadAllData() {
      try {
        setDbLoading(true);

        // 1. CARREGAR EMPRESA
        let currentEmpresa = INITIAL_COMPANY_SETTINGS;
        const savedEmpresa = localStorage.getItem('orcaplus_company_settings');
        if (savedEmpresa) {
          try {
            currentEmpresa = JSON.parse(savedEmpresa);
          } catch (_) {}
        }

        // Se por acaso a logo estiver vazia, gera no canvas
        if (!currentEmpresa.logo) {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1e293b'; // Slate 800
            ctx.beginPath();
            ctx.arc(100, 100, 100, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = '#0ea5e9'; // Sky Blue
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(100, 100, 85, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath();
            ctx.arc(100, 100, 18, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(150, 150);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(150, 50);
            ctx.lineTo(50, 150);
            ctx.stroke();

            ctx.fillStyle = '#0ea5e9';
            const points = [{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 50, y: 150 }, { x: 150, y: 150 }];
            points.forEach(pt => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 10, 0, 2 * Math.PI);
              ctx.fill();
            });

            const dataUrl = canvas.toDataURL('image/png');
            currentEmpresa = { ...currentEmpresa, logo: dataUrl };
            localStorage.setItem('orcaplus_company_settings', JSON.stringify(currentEmpresa));
          }
        }
        setEmpresa(currentEmpresa);

        // 2. CARREGAR CLIENTES
        let loadedClientes: Cliente[] = [];
        const savedClientes = localStorage.getItem('orcaplus_clients');
        if (savedClientes) {
          try {
            loadedClientes = JSON.parse(savedClientes);
          } catch (_) {}
        } else {
          loadedClientes = INITIAL_CLIENTS;
          localStorage.setItem('orcaplus_clients', JSON.stringify(loadedClientes));
        }
        setClientes(loadedClientes);

        // 3. CARREGAR PRODUTOS
        let loadedProdutos: Produto[] = [];
        const savedProdutos = localStorage.getItem('orcaplus_products');
        if (savedProdutos) {
          try {
            loadedProdutos = JSON.parse(savedProdutos);
          } catch (_) {}
        } else {
          loadedProdutos = INITIAL_PRODUCTS;
          localStorage.setItem('orcaplus_products', JSON.stringify(loadedProdutos));
        }
        setProdutos(loadedProdutos);

        // 4. CARREGAR ORÇAMENTOS
        let loadedOrcamentos: Orcamento[] = [];
        const savedBudgets = localStorage.getItem('orcaplus_budgets');
        if (savedBudgets) {
          try {
            loadedOrcamentos = JSON.parse(savedBudgets);
          } catch (_) {}
        } else {
          loadedOrcamentos = INITIAL_BUDGETS;
          localStorage.setItem('orcaplus_budgets', JSON.stringify(loadedOrcamentos));
        }
        setOrcamentos(loadedOrcamentos);

        localStorage.setItem('orcaplus_initialized', 'true');
      } catch (err) {
        console.error("Erro ao carregar dados locais:", err);
      } finally {
        setDbLoading(false);
      }
    }

    loadAllData();
  }, []);

  // MANUAL SYNCHRONIZATION FUNCTION
  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      setIsOfflineMode(false);

      // Sincroniza Empresa (Envia dados locais para o Firestore)
      await setDoc(doc(db, 'settings', 'company'), empresa);

      // Sincroniza Clientes (Envia todos os locais para o Firestore)
      for (const cli of clientes) {
        await setDoc(doc(db, 'clientes', cli.id), cli);
      }

      // Sincroniza Produtos (Envia todos os locais para o Firestore)
      for (const prod of produtos) {
        await setDoc(doc(db, 'produtos', prod.id), prod);
      }

      // Sincroniza Orçamentos (Envia todos os locais para o Firestore)
      for (const orc of orcamentos) {
        await setDoc(doc(db, 'orcamentos', orc.id), orc);
      }

      setHasSynced(true);
      alert("Todos os dados foram sincronizados com sucesso com o Firebase!");
    } catch (err) {
      console.error("Erro na sincronização manual:", err);
      setIsOfflineMode(true);
      alert("Falha na sincronização manual. Verifique sua conexão de Internet.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Salvar Empresa (APENAS LOCALSTORAGE)
  const handleSaveEmpresa = async (newSettings: CompanySettings) => {
    try {
      setEmpresa(newSettings);
      localStorage.setItem('orcaplus_company_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error("Erro ao salvar configuração da empresa localmente:", e);
    }
  };

  // Clientes (APENAS LOCALSTORAGE)
  const handleAddClient = async (cli: Cliente) => {
    try {
      const updated = [cli, ...clientes];
      setClientes(updated);
      localStorage.setItem('orcaplus_clients', JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao adicionar cliente localmente:", e);
    }
  };

  const handleUpdateClient = async (updatedCli: Cliente) => {
    try {
      const updated = clientes.map(c => c.id === updatedCli.id ? updatedCli : c);
      setClientes(updated);
      localStorage.setItem('orcaplus_clients', JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao atualizar cliente localmente:", e);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const updated = clientes.filter(c => c.id !== id);
      setClientes(updated);
      localStorage.setItem('orcaplus_clients', JSON.stringify(updated));
      // Remove do Firestore se existir para manter limpo, mas a sincronização geral é manual
      try {
        await deleteDoc(doc(db, 'clientes', id));
      } catch (_) {}
    } catch (e) {
      console.error("Erro ao remover cliente localmente:", e);
    }
  };

  // Produtos (APENAS LOCALSTORAGE)
  const handleAddProduct = async (prod: Produto) => {
    try {
      const updated = [prod, ...produtos];
      setProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao adicionar produto localmente:", e);
    }
  };

  const handleUpdateProduct = async (updatedProd: Produto) => {
    try {
      const updated = produtos.map(p => p.id === updatedProd.id ? updatedProd : p);
      setProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao atualizar produto localmente:", e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const updated = produtos.filter(p => p.id !== id);
      setProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
      try {
        await deleteDoc(doc(db, 'produtos', id));
      } catch (_) {}
    } catch (e) {
      console.error("Erro ao remover produto localmente:", e);
    }
  };

  // Orçamentos (APENAS LOCALSTORAGE)
  const handleAddOrcamento = async (orc: Orcamento) => {
    try {
      const updated = [orc, ...orcamentos];
      setOrcamentos(updated);
      localStorage.setItem('orcaplus_budgets', JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao gerar orçamento localmente:", e);
    }
  };

  const handleUpdateOrcamento = async (updatedOrc: Orcamento) => {
    try {
      const updated = orcamentos.map(o => o.id === updatedOrc.id ? updatedOrc : o);
      setOrcamentos(updated);
      localStorage.setItem('orcaplus_budgets', JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao atualizar orçamento localmente:", e);
    }
  };

  const handleDeleteOrcamento = async (id: string) => {
    try {
      const updated = orcamentos.filter(o => o.id !== id);
      setOrcamentos(updated);
      localStorage.setItem('orcaplus_budgets', JSON.stringify(updated));
      try {
        await deleteDoc(doc(db, 'orcamentos', id));
      } catch (_) {}
    } catch (e) {
      console.error("Erro ao excluir orçamento localmente:", e);
    }
  };

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-6">
        <div className="relative">
          <div className="p-4 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-sky-400">
            <Cpu size={40} className="animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
          </span>
        </div>
        <div className="space-y-2 text-center max-w-xs">
          <h2 className="text-base font-bold tracking-wider uppercase text-slate-100">Vista Aérea Drones</h2>
          <p className="text-xs text-sky-400 font-mono">Sincronizando com Banco Cloud Firebase...</p>
        </div>
        <div className="flex items-center space-x-2 text-slate-500 text-xs">
          <RefreshCw size={14} className="animate-spin" />
          <span>Aguarde um instante</span>
        </div>
      </div>
    );
  }

  // Mandatory Login Screen Flow
  if (!currentUser) {
    return (
      <AuthScreen 
        onSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('vista_aerea_active_session', JSON.stringify(user));
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans pb-20 md:pb-0 select-text">
      {/* Persistent Sidebar - Desktop only */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 h-screen sticky top-0 border-r border-slate-800 z-30 shadow-lg justify-between p-5">
        <div className="flex flex-col space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800/80">
            {empresa.logo ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center p-0.5 flex-shrink-0 shadow-sm">
                <img src={empresa.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="p-2 bg-sky-500 rounded-lg text-white">
                <Cpu size={18} className="animate-pulse" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xs font-extrabold tracking-tight text-slate-100 truncate leading-tight">
                {empresa.nomeFantasia || 'Vista Aérea Drones'}
              </h1>
              <p className="text-[8px] text-sky-400 font-mono tracking-wider font-semibold uppercase truncate">
                PROPOSTAS COMERCIAIS
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1.5 pt-2">
            <button
              onClick={() => {
                setInitialIsGeneratingBudget(false);
                setInitialIsAddingClient(false);
                setInitialIsAddingProduct(false);
                setActiveTab('dashboard');
              }}
              className={`flex items-center space-x-3 w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 font-bold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => {
                setInitialIsGeneratingBudget(false);
                setInitialIsAddingClient(false);
                setInitialIsAddingProduct(false);
                setActiveTab('orcamentos');
              }}
              className={`flex items-center space-x-3 w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'orcamentos'
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 font-bold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FileText size={16} />
              <span>Orçamentos</span>
            </button>

            <button
              onClick={() => {
                setInitialIsGeneratingBudget(false);
                setInitialIsAddingClient(false);
                setInitialIsAddingProduct(false);
                setActiveTab('clientes');
              }}
              className={`flex items-center space-x-3 w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'clientes'
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 font-bold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Users size={16} />
              <span>Clientes</span>
            </button>

            <button
              onClick={() => {
                setInitialIsGeneratingBudget(false);
                setInitialIsAddingClient(false);
                setInitialIsAddingProduct(false);
                setActiveTab('produtos');
              }}
              className={`flex items-center space-x-3 w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'produtos'
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 font-bold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <ShoppingBag size={16} />
              <span>Serviços / Produtos</span>
            </button>

            <button
              onClick={() => {
                setInitialIsGeneratingBudget(false);
                setInitialIsAddingClient(false);
                setInitialIsAddingProduct(false);
                setActiveTab('empresa');
              }}
              className={`flex items-center space-x-3 w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'empresa'
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 font-bold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Building size={16} />
              <span>Minha Empresa</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800/80">
          {/* Cloud Sync Status */}
          {isOfflineMode ? (
            <div className="flex items-center space-x-2 bg-amber-950/45 border border-amber-905 px-3 py-2 rounded-xl text-[10px] font-bold text-amber-400">
              <span className="relative flex h-1.5 w-1.5 select-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span className="font-mono">MODO OFFLINE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-sky-955/45 border border-sky-905 px-3 py-2 rounded-xl text-[10px] font-bold text-sky-400">
              <span className="relative flex h-1.5 w-1.5 select-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
              </span>
              <span className="font-mono">CLOUDSYNC ATIVO</span>
            </div>
          )}

          {/* Operator and Logout */}
          <div className="flex items-center justify-between bg-slate-850 p-2.5 rounded-xl border border-slate-800/80">
            <div className="truncate mr-1.5">
              <p className="text-[10px] font-semibold text-slate-300 truncate">{currentUser.email}</p>
              <p className="text-[8px] text-slate-500 font-mono">Operador Ativo</p>
            </div>
            <button
              onClick={() => {
                setCurrentUser(null);
                localStorage.removeItem('vista_aerea_active_session');
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-900 transition flex-shrink-0 cursor-pointer"
              title="Sair"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Dynamic Header - Mobile only */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900 text-white px-4 py-4 shadow-sm border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {empresa.logo ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-700 flex items-center justify-center p-1 flex-shrink-0 shadow-md">
              <img src={empresa.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="p-2 bg-sky-500 rounded-xl text-white shadow-md">
              <Cpu size={22} className="animate-pulse" />
            </div>
          )}
          <div>
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-slate-100 leading-tight">
              {empresa.nomeFantasia || 'Vista Aérea Drones'}
            </h1>
            <p className="text-[9px] text-sky-400 font-mono tracking-wider font-semibold uppercase">
              SISTEMA DE PROPOSTAS COMERCIAIS
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isOfflineMode ? (
            <div className="flex items-center space-x-1.5 bg-amber-950 border border-amber-850 px-2.5 py-1 rounded-full text-[9px] font-bold text-amber-400 flex-shrink-0">
              <span className="relative flex h-1.5 w-1.5 select-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span>OFFLINE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-full text-[9px] font-bold text-sky-400 flex-shrink-0">
              <span className="relative flex h-1.5 w-1.5 select-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
              </span>
              <span>NUVEM</span>
            </div>
          )}

          <button
            onClick={() => {
              setCurrentUser(null);
              localStorage.removeItem('vista_aerea_active_session');
            }}
            className="p-1 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-900 text-slate-300 hover:text-white transition flex items-center space-x-1 cursor-pointer"
            title="Sair da Conta"
          >
            <LogOut size={12} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Sair</span>
          </button>
        </div>
      </header>


      {/* Main Container / Content Switcher Router */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-pane"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Dashboard
                orcamentos={orcamentos}
                clientes={clientes}
                produtos={produtos}
                empresa={empresa}
                onNavigate={(tab, action) => {
                  if (tab === 'orcamentos') {
                    setInitialIsGeneratingBudget(action === 'emitir');
                  } else if (tab === 'clientes') {
                    setInitialIsAddingClient(action === 'adicionar');
                  } else if (tab === 'produtos') {
                    setInitialIsAddingProduct(action === 'adicionar');
                  }
                  setActiveTab(tab);
                }}
                onPreviewOrcamento={(orc) => setDashboardPreviewOrcamento(orc)}
                onDownloadPDF={async (orc) => {
                  try {
                    await gerarOrcamentoPDF(orc, empresa);
                  } catch (err) {
                    console.error('Erro ao gerar PDF do Dashboard:', err);
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'orcamentos' && (
            <motion.div
              key="orcamentos-pane"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <BudgetGenerator
                clientes={clientes}
                produtos={produtos}
                orcamentos={orcamentos}
                empresa={empresa}
                onAddOrcamento={handleAddOrcamento}
                onDeleteOrcamento={handleDeleteOrcamento}
                onUpdateOrcamento={handleUpdateOrcamento}
                initialIsGenerating={initialIsGeneratingBudget}
              />
            </motion.div>
          )}

          {activeTab === 'clientes' && (
            <motion.div
              key="clientes-pane"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ClientRegistration
                clientes={clientes}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
                initialIsAdding={initialIsAddingClient}
              />
            </motion.div>
          )}

          {activeTab === 'produtos' && (
            <motion.div
              key="produtos-pane"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProductRegistration
                produtos={produtos}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                initialIsAdding={initialIsAddingProduct}
              />
            </motion.div>
          )}

          {activeTab === 'empresa' && (
            <motion.div
              key="empresa-pane"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <CompanySettingsForm
                settings={empresa}
                onSave={handleSaveEmpresa}
                onManualSync={handleManualSync}
                isSyncing={isSyncing}
                hasSynced={hasSynced}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* iOS styled Premium bottom Navigation Tab Bar */}
      <nav id="navbar-iphone-dock" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 flex py-1.5 px-3.5 justify-around shadow-lg">
        {/* Dashboard Tab */}
        <button
          onClick={() => {
            setInitialIsGeneratingBudget(false);
            setInitialIsAddingClient(false);
            setInitialIsAddingProduct(false);
            setActiveTab('dashboard');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'dashboard' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] leading-none">Início</span>
        </button>

        {/* Orçamentos Tab */}
        <button
          onClick={() => {
            setInitialIsGeneratingBudget(false);
            setInitialIsAddingClient(false);
            setInitialIsAddingProduct(false);
            setActiveTab('orcamentos');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'orcamentos' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText size={20} />
          <span className="text-[10px] leading-none">Orçamentos</span>
        </button>

        {/* Clientes Tab */}
        <button
          onClick={() => {
            setInitialIsGeneratingBudget(false);
            setInitialIsAddingClient(false);
            setInitialIsAddingProduct(false);
            setActiveTab('clientes');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'clientes' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={20} />
          <span className="text-[10px] leading-none uppercase tracking-tight font-black">Cadastro Clientes</span>
        </button>

        {/* Catalog/Produtos Tab */}
        <button
          onClick={() => {
            setInitialIsGeneratingBudget(false);
            setInitialIsAddingClient(false);
            setInitialIsAddingProduct(false);
            setActiveTab('produtos');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'produtos' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingBag size={20} />
          <span className="text-[10px] leading-none uppercase tracking-tight font-black text-center">Cadastro Serviços/Produtos</span>
        </button>

        {/* Minha Empresa Tab */}
        <button
          onClick={() => {
            setInitialIsGeneratingBudget(false);
            setInitialIsAddingClient(false);
            setInitialIsAddingProduct(false);
            setActiveTab('empresa');
          }}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'empresa' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building size={20} />
          <span className="text-[10px] leading-none">Empresa</span>
        </button>
      </nav>

      {/* Dashboard PDF Preview Modal */}
      <AnimatePresence>
        {dashboardPreviewOrcamento && (
          <BudgetPreviewModal
            orcamento={dashboardPreviewOrcamento}
            empresa={empresa}
            onClose={() => setDashboardPreviewOrcamento(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
