import React, { useState, useEffect } from 'react';
import { CompanySettings, Cliente, Produto, Orcamento, Recibo } from './types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CLIENTS,
  INITIAL_PRODUCTS,
  INITIAL_BUDGETS,
} from './utils/initialData';
import { parseCompanyCityAndUf } from './utils/addressUtils';

import CompanySettingsForm from './components/CompanySettingsForm';
import ClientRegistration from './components/ClientRegistration';
import ProductRegistration from './components/ProductRegistration';
import BudgetGenerator from './components/BudgetGenerator';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import BudgetPreviewModal from './components/BudgetPreviewModal';
import FiscalModule from './components/FiscalModule';
import FloatingNavigation from './components/FloatingNavigation';
import SidebarDesktop from './components/SidebarDesktop';
import { gerarOrcamentoPDF } from './utils/pdfGenerator';

import { Cpu, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { db, auth } from './firebase';
import { debouncedSetUserDoc, sanitizeForFirestore } from './utils/firebaseDebounce';

import ConfirmEmail from './components/ConfirmEmail';
import ApexCoreLogo from './components/ApexCoreLogo';

const EMPTY_COMPANY_SETTINGS: CompanySettings = {
  nomeFantasia: 'Vista Aérea Drone LTDA',
  razaoSocial: 'Vista Aérea Drone LTDA',
  cnpj: '32.216.083/0001-47',
  inscricaoMunicipal: '99942',
  inscricaoEstadual: 'ISENTO',
  endereco: 'Rua Sereia de Itapuã',
  numero: '81',
  complemento: '',
  bairro: 'Itapuã',
  municipio: 'Vila Velha',
  uf: 'ES',
  cep: '29101-530',
  email: 'contato@vistaaereadrone.com.br',
  telefone: '',
  logo: '',
  fiscalSettings: {
    inscricaoMunicipal: '99942',
    regimeTributario: 'simples_nacional',
    uf: 'ES',
    ambiente: 'producao',
    cbsRate: 0.9,
    ibsRate: 0.1,
    modoSimulacao: true,
  }
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orcamentos' | 'clientes' | 'produtos' | 'empresa' | 'fiscal'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if we are on the confirm route
  if (window.location.pathname === '/confirmar') {
    return <ConfirmEmail />;
  }

  // Dashboard shortcut navigation states
  const [initialIsGeneratingBudget, setInitialIsGeneratingBudget] = useState(false);
  const [initialIsAddingClient, setInitialIsAddingClient] = useState(false);
  const [initialIsAddingProduct, setInitialIsAddingProduct] = useState(false);
  const [dashboardPreviewOrcamento, setDashboardPreviewOrcamento] = useState<Orcamento | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string; isGuest?: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core App States
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [empresa, setEmpresa] = useState<CompanySettings>(EMPTY_COMPANY_SETTINGS);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    // Process redirect result if user completed Google sign-in redirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const user = result.user;
          console.log('Login com Google via redirect realizado com sucesso:', user.email);
          try {
            await setDoc(
              doc(db, 'users', user.uid),
              {
                name: user.displayName || 'Usuário Google',
                email: user.email?.toLowerCase().trim() || '',
                emailVerified: true,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
            localStorage.setItem('email_verified_' + user.uid, 'true');
          } catch (e) {
            console.warn('Erro ao salvar usuário do redirect:', e);
          }
          setCurrentUser({ uid: user.uid, email: user.email || '' });
        }
      })
      .catch((err) => {
        console.warn('Erro em getRedirectResult:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Google provider or emailVerified user is automatically verified
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        let isVerified = user.emailVerified || isGoogleUser;

        if (!isVerified) {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            if (userDocSnap.exists() && userDocSnap.data().emailVerified === true) {
              isVerified = true;
            }
          } catch (error: any) {
            console.warn("Erro ao verificar status do e-mail no Firestore, tentando cache local:", error);
          }

          if (!isVerified && localStorage.getItem('email_verified_' + user.uid) === 'true') {
            isVerified = true;
          }
        }

        if (isVerified) {
          localStorage.setItem('email_verified_' + user.uid, 'true');
          setCurrentUser({ uid: user.uid, email: user.email || '' });
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Rastreamento de ociosidade (ausência de uso) para sincronização sem bloquear o uso ativo
  const lastActivityRef = React.useRef<number>(Date.now());
  const [isIdle, setIsIdle] = React.useState(true);
  const pendingSyncRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const opts = { passive: true };
    window.addEventListener('mousemove', handleActivity, opts);
    window.addEventListener('keydown', handleActivity, opts);
    window.addEventListener('mousedown', handleActivity, opts);
    window.addEventListener('touchstart', handleActivity, opts);
    window.addEventListener('input', handleActivity, opts);
    window.addEventListener('scroll', handleActivity, opts);

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      setIsIdle(idleTime >= 3000);
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('input', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, []);

  // Sincronização automática com o banco de dados realizada em lote
  React.useEffect(() => {
    async function performIdleSync() {
      if (!isIdle || !pendingSyncRef.current || !currentUser?.uid || isSyncing) return;
      const uid = currentUser.uid;
      try {
        setIsSyncing(true);

        // Salvar em cache local primeiro
        localStorage.setItem(`orcaplus_${uid}_empresa`, JSON.stringify(empresa));
        localStorage.setItem(`orcaplus_${uid}_clientes`, JSON.stringify(clientes));
        localStorage.setItem(`orcaplus_${uid}_produtos`, JSON.stringify(produtos));
        localStorage.setItem(`orcaplus_${uid}_orcamentos`, JSON.stringify(orcamentos));
        localStorage.setItem(`orcaplus_${uid}_invoices`, JSON.stringify(invoices));
        localStorage.setItem(`orcaplus_${uid}_recibos`, JSON.stringify(recibos));

        // Enviar para Firestore em lotes seguros (< 200 itens por lote)
        const allOperations: { docRef: any; data: any }[] = [
          { docRef: doc(db, 'users', uid, 'settings', 'company'), data: empresa },
          ...clientes.map(c => ({ docRef: doc(db, 'users', uid, 'clientes', c.id), data: c })),
          ...produtos.map(p => ({ docRef: doc(db, 'users', uid, 'produtos', p.id), data: p })),
          ...orcamentos.map(o => ({ docRef: doc(db, 'users', uid, 'orcamentos', o.id), data: o })),
          ...invoices.map(i => ({ docRef: doc(db, 'users', uid, 'invoices', i.id), data: i })),
          ...recibos.map(r => ({ docRef: doc(db, 'users', uid, 'recibos', r.id), data: r })),
        ];

        const CHUNK_SIZE = 200;
        for (let i = 0; i < allOperations.length; i += CHUNK_SIZE) {
          const chunk = allOperations.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(op => {
            batch.set(op.docRef, sanitizeForFirestore(op.data));
          });
          await batch.commit();
        }

        pendingSyncRef.current = false;
        console.log("Sincronização com o banco de dados e armazenamento local realizada com sucesso.");
      } catch (err) {
        console.error("Erro na sincronização automática:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    if (isIdle && pendingSyncRef.current) {
      performIdleSync();
    }
  }, [isIdle, currentUser, empresa, clientes, produtos, orcamentos, invoices, recibos]);

  // Carregamento inicial de dados (combinando cache local e Firestore)
  useEffect(() => {
    async function loadAllData() {
      if (!currentUser || !currentUser.uid) {
        setClientes([]);
        setProdutos([]);
        setOrcamentos([]);
        setInvoices([]);
        setRecibos([]);
        setEmpresa(EMPTY_COMPANY_SETTINGS);
        setDbLoading(false);
        return;
      }

      const uid = currentUser.uid;
      setDbLoading(true);
      setDbError(null);

      // 1. Carregar do cache local imediatamente para exibição instantânea
      try {
        const localCompanyStr = localStorage.getItem(`orcaplus_${uid}_empresa`);
        const localCliStr = localStorage.getItem(`orcaplus_${uid}_clientes`);
        const localProdStr = localStorage.getItem(`orcaplus_${uid}_produtos`);
        const localOrcStr = localStorage.getItem(`orcaplus_${uid}_orcamentos`);
        const localInvStr = localStorage.getItem(`orcaplus_${uid}_invoices`);
        const localRecStr = localStorage.getItem(`orcaplus_${uid}_recibos`);

        if (localCompanyStr) setEmpresa(JSON.parse(localCompanyStr));
        if (localCliStr) setClientes(JSON.parse(localCliStr));
        if (localProdStr) setProdutos(JSON.parse(localProdStr));
        if (localOrcStr) setOrcamentos(JSON.parse(localOrcStr));
        if (localInvStr) setInvoices(JSON.parse(localInvStr));
        if (localRecStr) setRecibos(JSON.parse(localRecStr));
      } catch (cacheErr) {
        console.warn("Erro ao ler cache local:", cacheErr);
      }

      const fetchWithTimeout = <T,>(promise: Promise<T>, timeoutMs = 8000): Promise<T | null> => {
        let timer: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), timeoutMs);
        });
        return Promise.race([promise, timeoutPromise])
          .then(res => {
            clearTimeout(timer);
            return res as T;
          })
          .catch(err => {
            clearTimeout(timer);
            console.warn("Erro na requisição Firestore:", err);
            return null;
          });
      };

      try {
        console.log(`Buscando dados atualizados do Firestore (${uid})...`);

        const [companySnap, cliSnap, prodSnap, orcSnap, invSnap, recSnap] = await Promise.all([
          fetchWithTimeout(getDoc(doc(db, 'users', uid, 'settings', 'company'))),
          fetchWithTimeout(getDocs(collection(db, 'users', uid, 'clientes'))),
          fetchWithTimeout(getDocs(collection(db, 'users', uid, 'produtos'))),
          fetchWithTimeout(getDocs(collection(db, 'users', uid, 'orcamentos'))),
          fetchWithTimeout(getDocs(collection(db, 'users', uid, 'invoices'))),
          fetchWithTimeout(getDocs(collection(db, 'users', uid, 'recibos'))),
        ]);

        let hasNetworkError = false;

        const mergeLists = <T extends { id: string }>(fsItems: T[], localKey: string): T[] => {
          let localItems: T[] = [];
          try {
            const raw = localStorage.getItem(localKey);
            if (raw) localItems = JSON.parse(raw);
          } catch (e) {}

          const map = new Map<string, T>();
          localItems.forEach(item => { if (item && item.id) map.set(item.id, item); });
          fsItems.forEach(item => { if (item && item.id) map.set(item.id, item); });

          const merged = Array.from(map.values());
          localStorage.setItem(localKey, JSON.stringify(merged));
          return merged;
        };

        if (companySnap) {
          if (companySnap.exists()) {
            const companyData = companySnap.data() as CompanySettings;
            setEmpresa(companyData);
            localStorage.setItem(`orcaplus_${uid}_empresa`, JSON.stringify(companyData));
          }
        } else {
          hasNetworkError = true;
        }

        if (cliSnap) {
          const fsCli = cliSnap.docs.map(d => d.data() as Cliente);
          const mergedCli = mergeLists(fsCli, `orcaplus_${uid}_clientes`);
          setClientes(mergedCli);
        } else {
          hasNetworkError = true;
        }

        if (prodSnap) {
          const fsProd = prodSnap.docs.map(d => d.data() as Produto);
          const mergedProd = mergeLists(fsProd, `orcaplus_${uid}_produtos`);
          setProdutos(mergedProd);
        } else {
          hasNetworkError = true;
        }

        if (orcSnap) {
          const fsOrc = orcSnap.docs.map(d => d.data() as Orcamento);
          const mergedOrc = mergeLists(fsOrc, `orcaplus_${uid}_orcamentos`);
          setOrcamentos(mergedOrc);
        } else {
          hasNetworkError = true;
        }

        if (invSnap) {
          const fsInv = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const mergedInv = mergeLists(fsInv, `orcaplus_${uid}_invoices`);
          setInvoices(mergedInv);
        } else {
          hasNetworkError = true;
        }

        if (recSnap) {
          const fsRec = recSnap.docs.map(d => d.data() as Recibo);
          const mergedRec = mergeLists(fsRec, `orcaplus_${uid}_recibos`);
          setRecibos(mergedRec);
        } else {
          hasNetworkError = true;
        }

        setIsOfflineMode(hasNetworkError);
        console.log(`Carregamento concluído com sucesso para ${currentUser.email}`);
      } catch (err) {
        console.error("Erro ao carregar dados do banco:", err);
        setIsOfflineMode(true);
      } finally {
        setDbLoading(false);
      }
    }

    if (currentUser) {
      loadAllData();
    } else {
      setDbLoading(false);
    }
  }, [currentUser]);

  // FUNÇÃO DE SINCRONIZAÇÃO MANUAL
  const handleManualSync = async () => {
    if (isSyncing || !currentUser?.uid) return;
    const uid = currentUser.uid;
    try {
      setIsSyncing(true);
      setIsOfflineMode(false);

      // Salvar localmente
      localStorage.setItem(`orcaplus_${uid}_empresa`, JSON.stringify(empresa));
      localStorage.setItem(`orcaplus_${uid}_clientes`, JSON.stringify(clientes));
      localStorage.setItem(`orcaplus_${uid}_produtos`, JSON.stringify(produtos));
      localStorage.setItem(`orcaplus_${uid}_orcamentos`, JSON.stringify(orcamentos));
      localStorage.setItem(`orcaplus_${uid}_invoices`, JSON.stringify(invoices));
      localStorage.setItem(`orcaplus_${uid}_recibos`, JSON.stringify(recibos));

      const allOperations: { docRef: any; data: any }[] = [
        { docRef: doc(db, 'users', uid, 'settings', 'company'), data: empresa },
        ...clientes.map(c => ({ docRef: doc(db, 'users', uid, 'clientes', c.id), data: c })),
        ...produtos.map(p => ({ docRef: doc(db, 'users', uid, 'produtos', p.id), data: p })),
        ...orcamentos.map(o => ({ docRef: doc(db, 'users', uid, 'orcamentos', o.id), data: o })),
        ...invoices.map(i => ({ docRef: doc(db, 'users', uid, 'invoices', i.id), data: i })),
        ...recibos.map(r => ({ docRef: doc(db, 'users', uid, 'recibos', r.id), data: r })),
      ];

      const CHUNK_SIZE = 200;
      for (let i = 0; i < allOperations.length; i += CHUNK_SIZE) {
        const chunk = allOperations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          batch.set(op.docRef, sanitizeForFirestore(op.data));
        });
        await batch.commit();
      }

      pendingSyncRef.current = false;
      setHasSynced(true);
      alert("Seus dados foram sincronizados diretamente com o banco de dados com sucesso!");
    } catch (err) {
      console.error("Erro na sincronização manual:", err);
      setIsOfflineMode(true);
      alert("Falha na sincronização manual. Os dados estão preservados localmente.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Salvar Empresa
  const handleSaveEmpresa = async (newSettings: CompanySettings) => {
    setEmpresa(newSettings);
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      localStorage.setItem(`orcaplus_${currentUser.uid}_empresa`, JSON.stringify(newSettings));
      debouncedSetUserDoc(currentUser.uid, 'settings', 'company', newSettings);
    }
  };

  // Notas Fiscais (Faturas)
  const handleAddInvoice = async (newInv: any) => {
    setInvoices(prev => {
      const updated = [newInv, ...prev];
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_invoices`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'invoices', newInv.id, newInv);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleUpdateInvoice = async (updatedInv: any) => {
    setInvoices(prev => {
      const updated = prev.map(i => i.id === updatedInv.id ? updatedInv : i);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_invoices`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'invoices', updatedInv.id, updatedInv);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleDeleteInvoice = async (id: string) => {
    setInvoices(prev => {
      const updated = prev.filter(i => i.id !== id);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_invoices`, JSON.stringify(updated));
      }
      return updated;
    });
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'invoices', id));
      } catch (e) {
        console.error("Erro ao excluir nota fiscal do banco:", e);
      }
    }
  };

  const handleClearAllInvoices = async () => {
    const idsToDelete = invoices.map(i => i.id);
    setInvoices([]);
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      localStorage.setItem(`orcaplus_${currentUser.uid}_invoices`, JSON.stringify([]));
      for (const id of idsToDelete) {
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'invoices', id));
        } catch (e) {
          console.error("Erro ao limpar nota fiscal do banco:", e);
        }
      }
    }
  };

  // Clientes
  const handleAddClient = async (cli: Cliente) => {
    setClientes(prev => {
      const updated = [cli, ...prev];
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_clientes`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'clientes', cli.id, cli);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleUpdateClient = async (updatedCli: Cliente) => {
    setClientes(prev => {
      const updated = prev.map(c => c.id === updatedCli.id ? updatedCli : c);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_clientes`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'clientes', updatedCli.id, updatedCli);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleDeleteClient = async (id: string) => {
    setClientes(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_clientes`, JSON.stringify(updated));
      }
      return updated;
    });
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'clientes', id));
      } catch (e) {
        console.error("Erro ao excluir cliente do banco:", e);
      }
    }
  };

  // Produtos
  const handleAddProduct = async (prod: Produto) => {
    setProdutos(prev => {
      const updated = [prod, ...prev];
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_produtos`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'produtos', prod.id, prod);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleUpdateProduct = async (updatedProd: Produto) => {
    setProdutos(prev => {
      const updated = prev.map(p => p.id === updatedProd.id ? updatedProd : p);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_produtos`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'produtos', updatedProd.id, updatedProd);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleDeleteProduct = async (id: string) => {
    setProdutos(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_produtos`, JSON.stringify(updated));
      }
      return updated;
    });
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'produtos', id));
      } catch (e) {
        console.error("Erro ao excluir produto do banco:", e);
      }
    }
  };

  // Orçamentos
  const handleAddOrcamento = async (orc: Orcamento) => {
    setOrcamentos(prev => {
      const updated = [orc, ...prev];
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_orcamentos`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'orcamentos', orc.id, orc);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleUpdateOrcamento = async (updatedOrc: Orcamento) => {
    setOrcamentos(prev => {
      const updated = prev.map(o => o.id === updatedOrc.id ? updatedOrc : o);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_orcamentos`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'orcamentos', updatedOrc.id, updatedOrc);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleDeleteOrcamento = async (id: string) => {
    setOrcamentos(prev => {
      const updated = prev.filter(o => o.id !== id);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_orcamentos`, JSON.stringify(updated));
      }
      return updated;
    });
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'orcamentos', id));
      } catch (e) {
        console.error("Erro ao excluir orçamento do banco:", e);
      }
    }
  };

  const handleAddRecibo = async (rec: Recibo) => {
    setRecibos(prev => {
      const updated = [rec, ...prev];
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_recibos`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'recibos', rec.id, rec);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleUpdateRecibo = async (updatedRec: Recibo) => {
    setRecibos(prev => {
      const updated = prev.map(r => r.id === updatedRec.id ? updatedRec : r);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_recibos`, JSON.stringify(updated));
        debouncedSetUserDoc(currentUser.uid, 'recibos', updatedRec.id, updatedRec);
      }
      return updated;
    });
    pendingSyncRef.current = true;
  };

  const handleDeleteRecibo = async (id: string) => {
    setRecibos(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (currentUser?.uid) {
        localStorage.setItem(`orcaplus_${currentUser.uid}_recibos`, JSON.stringify(updated));
      }
      return updated;
    });
    pendingSyncRef.current = true;
    if (currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'recibos', id));
      } catch (e) {
        console.error("Erro ao excluir recibo do banco:", e);
      }
    }
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-6">
        <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">
          <Cpu size={40} />
        </div>
        <div className="space-y-2 text-center max-w-xs">
          <h2 className="text-base font-bold tracking-wider uppercase text-slate-100">Erro de Sincronização</h2>
          <p className="text-xs text-red-400 font-mono">
            {dbError}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => { setDbError(null); setIsOfflineMode(true); }}
            className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition border border-slate-700"
          >
            Usar Modo Local / Offline
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-bold transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (dbLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center p-6 space-y-6">
        <ApexCoreLogo size="lg" />
        <div className="space-y-2 text-center max-w-xs">
          <p className="text-xs text-sky-400 font-mono tracking-wider font-semibold">
            {authLoading ? 'Verificando sessão com o Google e Firebase...' : 'Sincronizando com Banco Cloud Firebase...'}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono">
          <RefreshCw size={14} className="animate-spin text-sky-400" />
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
        }} 
      />
    );
  }

  const handleQuickAction = (action: 'emitir_orcamento' | 'add_cliente' | 'add_produto' | 'fiscal') => {
    setInitialIsGeneratingBudget(false);
    setInitialIsAddingClient(false);
    setInitialIsAddingProduct(false);

    if (action === 'emitir_orcamento') {
      setInitialIsGeneratingBudget(true);
      setActiveTab('orcamentos');
    } else if (action === 'add_cliente') {
      setInitialIsAddingClient(true);
      setActiveTab('clientes');
    } else if (action === 'add_produto') {
      setInitialIsAddingProduct(true);
      setActiveTab('produtos');
    } else if (action === 'fiscal') {
      setActiveTab('fiscal');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1b2d] text-slate-100 flex flex-col font-sans select-text relative overflow-x-hidden pb-24 lg:pb-8">
      {/* Ambient background lighting orbs */}
      <div className="bg-glow-orb-1" />
      <div className="bg-glow-orb-2" />

      {/* Floating Header & Navigation Island */}
      <FloatingNavigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setInitialIsGeneratingBudget(false);
          setInitialIsAddingClient(false);
          setInitialIsAddingProduct(false);
          setActiveTab(tab);
        }}
        empresa={empresa}
        currentUser={currentUser}
        isOfflineMode={isOfflineMode}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        onSignOut={async () => {
          await signOut(auth);
          setCurrentUser(null);
        }}
        onQuickAction={handleQuickAction}
        counts={{
          orcamentos: orcamentos.length,
          clientes: clientes.length,
          produtos: produtos.length,
          invoices: invoices.length
        }}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Glass Content View Router with Adaptive Sidebar */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 md:px-8 py-4 relative z-10 flex gap-6">
        <SidebarDesktop
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setInitialIsGeneratingBudget(false);
            setInitialIsAddingClient(false);
            setInitialIsAddingProduct(false);
            setActiveTab(tab);
          }}
          empresa={empresa}
          counts={{
            orcamentos: orcamentos.length,
            clientes: clientes.length,
            produtos: produtos.length,
            invoices: invoices.length
          }}
        />

        <main className="flex-1 min-w-0 transition-all duration-300">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-pane"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
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
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <BudgetGenerator
                clientes={clientes}
                produtos={produtos}
                orcamentos={orcamentos}
                recibos={recibos}
                empresa={empresa}
                onAddOrcamento={handleAddOrcamento}
                onDeleteOrcamento={handleDeleteOrcamento}
                onUpdateOrcamento={handleUpdateOrcamento}
                onAddRecibo={handleAddRecibo}
                onDeleteRecibo={handleDeleteRecibo}
                onUpdateRecibo={handleUpdateRecibo}
                onAddProduct={handleAddProduct}
                initialIsGenerating={initialIsGeneratingBudget}
                onConvertToInvoice={async (orc, type: 'NFE' | 'NFSE' | 'BOTH') => {
                  try {
                    const isService = (item: any) => {
                      if (!item) return false;
                      const t = (item.tipo || '').toString().toLowerCase();
                      if (t === 'servico' || t === 'serviço') return true;
                      if (t === 'produto') return false;
                      if (item.subServicos && item.subServicos.length > 0) return true;
                      const name = (item.nome || '').toLowerCase();
                      const serviceKeywords = [
                        'serviço', 'servico', 'mão de obra', 'mao de obra', 'mão-de-obra',
                        'manutenção', 'manutencao', 'reparo', 'troca', 'calibração', 'calibracao',
                        'instalação', 'instalacao', 'laudo', 'diagnóstico', 'diagnostico',
                        'conserto', 'revisão', 'revisao', 'ajuste', 'limpeza', 'assistência',
                        'assistencia', 'remapeamento'
                      ];
                      return serviceKeywords.some(kw => name.includes(kw));
                    };

                    const cepMatch = (orc.clienteEndereco || '').match(/\b\d{5}-?\d{3}\b/);
                    const parsedCep = cepMatch ? cepMatch[0] : (empresa.cep || '29107-250');

                    const parsedCompanyCityUf = parseCompanyCityAndUf(empresa);
                    const buildDestinatario = () => ({
                      nome: orc.clienteNome || 'Cliente Consumidor',
                      cpfCnpj: orc.clienteDocumento || '000.000.000-00',
                      endereco: orc.clienteEndereco || 'Endereço Não informado',
                      email: orc.clienteEmail || '',
                      telefone: orc.clienteTelefone || '',
                      cep: parsedCep,
                      bairro: 'Centro',
                      municipio: empresa.municipio || parsedCompanyCityUf.municipio,
                      uf: empresa.uf || parsedCompanyCityUf.uf
                    });

                    const newInvoicesToCreate: any[] = [];

                    if (type === 'NFE' || type === 'BOTH') {
                      const productItems = (orc.items || []).filter(item => !isService(item));
                      const productVal = productItems.reduce((acc, item) => acc + (item.quantidade * (item.precoUnitario || 0)), 0);
                      
                      newInvoicesToCreate.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'NFE',
                        number: type === 'BOTH' ? `${orc.numero}-NFE` : orc.numero,
                        clientName: orc.clienteNome || 'Cliente Consumidor',
                        totalValue: productItems.length > 0 ? productVal : orc.valorTotal,
                        status: 'pending_signature',
                        issueDate: new Date().toISOString(),
                        budgetRefId: orc.id,
                        items: productItems.length > 0 ? productItems : (orc.items || []),
                        clienteDocumento: orc.clienteDocumento || '',
                        clienteEndereco: orc.clienteEndereco || '',
                        clienteEmail: orc.clienteEmail || '',
                        clienteTelefone: orc.clienteTelefone || '',
                        observacoes: orc.observacoes || '',
                        destinatario: buildDestinatario()
                      });
                    }

                    if (type === 'NFSE' || type === 'BOTH') {
                      const serviceItems = (orc.items || []).filter(item => isService(item));
                      const serviceVal = serviceItems.reduce((acc, item) => acc + (item.quantidade * (item.precoUnitario || 0)), 0);

                      newInvoicesToCreate.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'NFSE',
                        number: type === 'BOTH' ? `${orc.numero}-NFSE` : orc.numero,
                        clientName: orc.clienteNome || 'Cliente Consumidor',
                        totalValue: serviceItems.length > 0 ? serviceVal : orc.valorTotal,
                        status: 'pending_signature',
                        issueDate: new Date().toISOString(),
                        budgetRefId: orc.id,
                        items: serviceItems.length > 0 ? serviceItems : (orc.items || []),
                        clienteDocumento: orc.clienteDocumento || '',
                        clienteEndereco: orc.clienteEndereco || '',
                        clienteEmail: orc.clienteEmail || '',
                        clienteTelefone: orc.clienteTelefone || '',
                        observacoes: orc.observacoes || '',
                        destinatario: buildDestinatario()
                      });
                    }

                    const updatedInvoices = [...newInvoicesToCreate, ...invoices];
                    setInvoices(updatedInvoices);
                    if (currentUser?.uid) {
                      localStorage.setItem(`orcaplus_${currentUser.uid}_invoices`, JSON.stringify(updatedInvoices));
                      for (const inv of newInvoicesToCreate) {
                        try {
                          debouncedSetUserDoc(currentUser.uid, 'invoices', inv.id, inv);
                        } catch (fsErr) {
                          console.error("Firebase invoice sync error:", fsErr);
                        }
                      }
                    }

                    setActiveTab('fiscal');
                  } catch (err) {
                    console.error('Erro ao converter orcamento:', err);
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'clientes' && (
            <motion.div
              key="clientes-pane"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
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
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
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
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <CompanySettingsForm
                settings={empresa}
                onSave={handleSaveEmpresa}
                onManualSync={handleManualSync}
                isSyncing={isSyncing}
                hasSynced={hasSynced}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {activeTab === 'fiscal' && (
            <motion.div
              key="fiscal-pane"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <FiscalModule
                empresa={empresa}
                clientes={clientes}
                produtos={produtos}
                orcamentos={orcamentos}
                invoices={invoices}
                onAddInvoice={handleAddInvoice}
                onUpdateInvoice={handleUpdateInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onClearAllInvoices={handleClearAllInvoices}
                onUpdateEmpresa={handleSaveEmpresa}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>

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
