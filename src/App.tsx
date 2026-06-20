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

import { FileText, Users, ShoppingBag, Building, Cpu, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'orcamentos' | 'clientes' | 'produtos' | 'empresa'>('orcamentos');

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
  const [empresa, setEmpresa] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Sincronização inicial com o Firebase
  useEffect(() => {
    async function loadAllData() {
      try {
        setDbLoading(true);
        const initialized = localStorage.getItem('orcaplus_initialized') === 'true';

        // 1. CARREGAR EMPRESA
        let currentEmpresa = INITIAL_COMPANY_SETTINGS;
        const savedEmpresa = localStorage.getItem('orcaplus_company_settings');
        if (savedEmpresa) {
          try {
            currentEmpresa = JSON.parse(savedEmpresa);
          } catch (_) {}
        }

        try {
          const companyRef = doc(db, 'settings', 'company');
          const companySnap = await getDoc(companyRef);
          if (companySnap.exists()) {
            currentEmpresa = companySnap.data() as CompanySettings;
            localStorage.setItem('orcaplus_company_settings', JSON.stringify(currentEmpresa));
          } else if (!initialized) {
            await setDoc(companyRef, currentEmpresa);
            localStorage.setItem('orcaplus_company_settings', JSON.stringify(currentEmpresa));
          }
        } catch (e) {
          console.warn("Firestore (empresa) indisponível ou sem permissão. Usando cópia local.", e);
          setIsOfflineMode(true);
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
            try {
              const companyRef = doc(db, 'settings', 'company');
              await setDoc(companyRef, currentEmpresa);
            } catch (_) {}
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
        }

        try {
          const clientsColl = collection(db, 'clientes');
          const clientsSnap = await getDocs(clientsColl);
          if (clientsSnap.empty) {
            if (!initialized && loadedClientes.length === 0) {
              for (const cli of INITIAL_CLIENTS) {
                await setDoc(doc(db, 'clientes', cli.id), cli);
              }
              loadedClientes = INITIAL_CLIENTS;
            } else if (!initialized) {
              loadedClientes = INITIAL_CLIENTS;
            } else {
              if (loadedClientes.length > 0) {
                for (const cli of loadedClientes) {
                  await setDoc(doc(db, 'clientes', cli.id), cli);
                }
              }
            }
          } else {
            const temp: Cliente[] = [];
            clientsSnap.forEach(docSnap => {
              temp.push(docSnap.data() as Cliente);
            });
            loadedClientes = temp;
          }
          localStorage.setItem('orcaplus_clients', JSON.stringify(loadedClientes));
        } catch (e) {
          console.warn("Firestore (clientes) indisponível. Usando cópia local.", e);
          setIsOfflineMode(true);
        }
        setClientes(loadedClientes);

        // 3. CARREGAR PRODUTOS
        let loadedProdutos: Produto[] = [];
        const savedProdutos = localStorage.getItem('orcaplus_products');
        if (savedProdutos) {
          try {
            loadedProdutos = JSON.parse(savedProdutos);
          } catch (_) {}
        }

        try {
          const productsColl = collection(db, 'produtos');
          const productsSnap = await getDocs(productsColl);
          if (productsSnap.empty) {
            if (!initialized && loadedProdutos.length === 0) {
              for (const prod of INITIAL_PRODUCTS) {
                await setDoc(doc(db, 'produtos', prod.id), prod);
              }
              loadedProdutos = INITIAL_PRODUCTS;
            } else if (!initialized) {
              loadedProdutos = INITIAL_PRODUCTS;
            } else {
              if (loadedProdutos.length > 0) {
                for (const prod of loadedProdutos) {
                  await setDoc(doc(db, 'produtos', prod.id), prod);
                }
              }
            }
          } else {
            const temp: Produto[] = [];
            productsSnap.forEach(docSnap => {
              temp.push(docSnap.data() as Produto);
            });
            loadedProdutos = temp;
          }
          localStorage.setItem('orcaplus_products', JSON.stringify(loadedProdutos));
        } catch (e) {
          console.warn("Firestore (produtos) indisponível. Usando cópia local.", e);
          setIsOfflineMode(true);
        }
        setProdutos(loadedProdutos);

        // 4. CARREGAR ORÇAMENTOS
        let loadedOrcamentos: Orcamento[] = [];
        const savedBudgets = localStorage.getItem('orcaplus_budgets');
        if (savedBudgets) {
          try {
            loadedOrcamentos = JSON.parse(savedBudgets);
          } catch (_) {}
        }

        try {
          const budgetsColl = collection(db, 'orcamentos');
          const budgetsSnap = await getDocs(budgetsColl);
          if (budgetsSnap.empty) {
            if (!initialized && loadedOrcamentos.length === 0) {
              for (const orc of INITIAL_BUDGETS) {
                await setDoc(doc(db, 'orcamentos', orc.id), orc);
              }
              loadedOrcamentos = INITIAL_BUDGETS;
            } else if (!initialized) {
              loadedOrcamentos = INITIAL_BUDGETS;
            } else {
              if (loadedOrcamentos.length > 0) {
                for (const orc of loadedOrcamentos) {
                  await setDoc(doc(db, 'orcamentos', orc.id), orc);
                }
              }
            }
          } else {
            const temp: Orcamento[] = [];
            budgetsSnap.forEach(docSnap => {
              temp.push(docSnap.data() as Orcamento);
            });
            loadedOrcamentos = temp;
          }
          localStorage.setItem('orcaplus_budgets', JSON.stringify(loadedOrcamentos));
        } catch (e) {
          console.warn("Firestore (orcamentos) indisponível. Usando cópia local.", e);
          setIsOfflineMode(true);
        }
        setOrcamentos(loadedOrcamentos);

        localStorage.setItem('orcaplus_initialized', 'true');
      } catch (err) {
        console.error("Erro geral ao sincronizar dados:", err);
        setIsOfflineMode(true);
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

      // Sincroniza Empresa
      try {
        const companyRef = doc(db, 'settings', 'company');
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
          const cloudEmpresa = companySnap.data() as CompanySettings;
          setEmpresa(cloudEmpresa);
          localStorage.setItem('orcaplus_company_settings', JSON.stringify(cloudEmpresa));
        } else {
          await setDoc(companyRef, empresa);
        }
      } catch (e) {
        console.error("Manual sync - empresa error:", e);
      }

      // Sincroniza Clientes
      try {
        const clientsColl = collection(db, 'clientes');
        const clientsSnap = await getDocs(clientsColl);
        if (!clientsSnap.empty) {
          const temp: Cliente[] = [];
          clientsSnap.forEach(docSnap => {
            temp.push(docSnap.data() as Cliente);
          });
          setClientes(temp);
          localStorage.setItem('orcaplus_clients', JSON.stringify(temp));
        } else {
          setClientes([]);
          localStorage.setItem('orcaplus_clients', JSON.stringify([]));
        }
      } catch (e) {
        console.error("Manual sync - clientes error:", e);
      }

      // Sincroniza Produtos
      try {
        const productsColl = collection(db, 'produtos');
        const productsSnap = await getDocs(productsColl);
        if (!productsSnap.empty) {
          const temp: Produto[] = [];
          productsSnap.forEach(docSnap => {
            temp.push(docSnap.data() as Produto);
          });
          setProdutos(temp);
          localStorage.setItem('orcaplus_products', JSON.stringify(temp));
        } else {
          setProdutos([]);
          localStorage.setItem('orcaplus_products', JSON.stringify([]));
        }
      } catch (e) {
        console.error("Manual sync - produtos error:", e);
      }

      // Sincroniza Orçamentos
      try {
        const budgetsColl = collection(db, 'orcamentos');
        const budgetsSnap = await getDocs(budgetsColl);
        if (!budgetsSnap.empty) {
          const temp: Orcamento[] = [];
          budgetsSnap.forEach(docSnap => {
            temp.push(docSnap.data() as Orcamento);
          });
          setOrcamentos(temp);
          localStorage.setItem('orcaplus_budgets', JSON.stringify(temp));
        } else {
          setOrcamentos([]);
          localStorage.setItem('orcaplus_budgets', JSON.stringify([]));
        }
      } catch (e) {
        console.error("Manual sync - orçamentos error:", e);
      }

      localStorage.setItem('orcaplus_initialized', 'true');
      alert("Todos os dados foram sincronizados com sucesso com o Firebase!");
    } catch (err) {
      console.error("Erro na sincronização manual:", err);
      setIsOfflineMode(true);
      alert("Falha na sincronização manual. Verifique sua conexão de Internet.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Salvar Empresa
  const handleSaveEmpresa = async (newSettings: CompanySettings) => {
    try {
      setEmpresa(newSettings);
      localStorage.setItem('orcaplus_company_settings', JSON.stringify(newSettings));
      await setDoc(doc(db, 'settings', 'company'), newSettings);
    } catch (e) {
      console.error("Erro ao salvar configuração da empresa no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  // Clientes
  const handleAddClient = async (cli: Cliente) => {
    try {
      const updated = [cli, ...clientes];
      setClientes(updated);
      localStorage.setItem('orcaplus_clients', JSON.stringify(updated));
      await setDoc(doc(db, 'clientes', cli.id), cli);
    } catch (e) {
      console.error("Erro ao adicionar cliente no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  const handleUpdateClient = async (updatedCli: Cliente) => {
    try {
      const updated = clientes.map(c => c.id === updatedCli.id ? updatedCli : c);
      setClientes(updated);
      localStorage.setItem('orcaplus_clients', JSON.stringify(updated));
      await setDoc(doc(db, 'clientes', updatedCli.id), updatedCli);
    } catch (e) {
      console.error("Erro ao atualizar cliente no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const updated = clientes.filter(c => c.id !== id);
      setClientes(updated);
      localStorage.setItem('orcaplus_clients', JSON.stringify(updated));
      await deleteDoc(doc(db, 'clientes', id));
    } catch (e) {
      console.error("Erro ao remover cliente no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  // Produtos
  const handleAddProduct = async (prod: Produto) => {
    try {
      const updated = [prod, ...produtos];
      setProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
      await setDoc(doc(db, 'produtos', prod.id), prod);
    } catch (e) {
      console.error("Erro ao adicionar produto no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  const handleUpdateProduct = async (updatedProd: Produto) => {
    try {
      const updated = produtos.map(p => p.id === updatedProd.id ? updatedProd : p);
      setProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
      await setDoc(doc(db, 'produtos', updatedProd.id), updatedProd);
    } catch (e) {
      console.error("Erro ao atualizar produto no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const updated = produtos.filter(p => p.id !== id);
      setProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
      await deleteDoc(doc(db, 'produtos', id));
    } catch (e) {
      console.error("Erro ao remover produto no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  // Orçamentos
  const handleAddOrcamento = async (orc: Orcamento) => {
    try {
      const updated = [orc, ...orcamentos];
      setOrcamentos(updated);
      localStorage.setItem('orcaplus_budgets', JSON.stringify(updated));
      await setDoc(doc(db, 'orcamentos', orc.id), orc);
    } catch (e) {
      console.error("Erro ao gerar orçamento no Firestore:", e);
      setIsOfflineMode(true);
    }
  };

  const handleDeleteOrcamento = async (id: string) => {
    try {
      const updated = orcamentos.filter(o => o.id !== id);
      setOrcamentos(updated);
      localStorage.setItem('orcaplus_budgets', JSON.stringify(updated));
      await deleteDoc(doc(db, 'orcamentos', id));
    } catch (e) {
      console.error("Erro ao excluir orçamento no Firestore:", e);
      setIsOfflineMode(true);
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 select-text">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-4 shadow-sm border-b border-slate-800 flex items-center justify-between">
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
            <div className="flex items-center space-x-1.5 bg-amber-950 border border-amber-850 px-2.5 py-1 rounded-full text-[9px] font-bold text-amber-400">
              <span className="relative flex h-1.5 w-1.5 select-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span>OFFLINE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-full text-[9px] font-bold text-sky-400">
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
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 pt-4">
        <AnimatePresence mode="wait">
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* iOS styled Premium bottom Navigation Tab Bar */}
      <nav id="navbar-iphone-dock" className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 flex py-1.5 px-3.5 justify-around shadow-lg">
        {/* Orçamentos Tab */}
        <button
          onClick={() => setActiveTab('orcamentos')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'orcamentos' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText size={20} />
          <span className="text-[10px] leading-none">Orçamentos</span>
        </button>

        {/* Clientes Tab */}
        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'clientes' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={20} />
          <span className="text-[10px] leading-none uppercase tracking-tight font-black">Cadastro Clientes</span>
        </button>

        {/* Catalog/Produtos Tab */}
        <button
          onClick={() => setActiveTab('produtos')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'produtos' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingBag size={20} />
          <span className="text-[10px] leading-none uppercase tracking-tight font-black text-center">Cadastro Serviços/Produtos</span>
        </button>

        {/* Minha Empresa Tab */}
        <button
          onClick={() => setActiveTab('empresa')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3.5 rounded-xl transition ${
            activeTab === 'empresa' ? 'text-sky-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building size={20} />
          <span className="text-[10px] leading-none">Empresa</span>
        </button>
      </nav>
    </div>
  );
}
