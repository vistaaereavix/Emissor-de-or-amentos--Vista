import React, { useState, useEffect } from 'react';
import { Produto } from '../types';
import { ShoppingBag, Search, Edit2, Trash2, Tag, Layers, Settings, Plus, ArrowLeft, HelpCircle, LayoutList, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductRegistrationProps {
  produtos: Produto[];
  onAddProduct: (produto: Produto) => void;
  onUpdateProduct: (produto: Produto) => void;
  onDeleteProduct: (id: string) => void;
  initialIsAdding?: boolean;
}

export default function ProductRegistration({
  produtos,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  initialIsAdding,
}: ProductRegistrationProps) {
  const [isAdding, setIsAdding] = useState(initialIsAdding || false);

  useEffect(() => {
    if (initialIsAdding) {
      setIsAdding(true);
    }
  }, [initialIsAdding]);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'large' | 'small'>('list');
  const [activeListTab, setActiveListTab] = useState<'produtos' | 'servicos'>('produtos');

  const [localProdutos, setLocalProdutos] = useState<Produto[]>(() => {
    const saved = localStorage.getItem('orcaplus_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) {}
    }
    return produtos && produtos.length > 0 ? produtos : [];
  });

  // Independent initialization function
  useEffect(() => {
    const saved = localStorage.getItem('orcaplus_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalProdutos(parsed);
          return;
        }
      } catch (_) {}
    }
    if (produtos && produtos.length > 0) {
      setLocalProdutos(produtos);
    }
  }, [produtos]);

  // Formulário
  const [tipo, setTipo] = useState<'Produto' | 'Servico'>('Produto');
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [condicao, setCondicao] = useState<string>('Novo');
  const [ncm, setNcm] = useState('');
  const [valorCusto, setValorCusto] = useState<string>('');
  const [valorFinal, setValorFinal] = useState<string>('');

  // Carrega rascunho (draft) do local storage ao inicializar
  useEffect(() => {
    const savedDraft = localStorage.getItem('draft_product_form');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.isAdding) {
          setIsAdding(true);
          setTipo(draft.tipo || 'Produto');
          setNome(draft.nome || '');
          setMarca(draft.marca || '');
          setModelo(draft.modelo || '');
          setCondicao(draft.condicao || 'Novo');
          setNcm(draft.ncm || '');
          setValorCusto(draft.valorCusto || '');
          setValorFinal(draft.valorFinal || '');
          if (draft.editingProduct) {
            setEditingProduct(draft.editingProduct);
          }
        }
      } catch (_) {}
    }
  }, []);

  // Salva rascunho do formulário de produto/serviço no local storage
  useEffect(() => {
    if (isAdding) {
      const draft = {
        isAdding,
        tipo,
        nome,
        marca,
        modelo,
        condicao,
        ncm,
        editingProduct,
        valorCusto,
        valorFinal
      };
      localStorage.setItem('draft_product_form', JSON.stringify(draft));
    } else {
      localStorage.removeItem('draft_product_form');
    }
  }, [isAdding, tipo, nome, marca, modelo, condicao, ncm, editingProduct, valorCusto, valorFinal]);

  const startEdit = (prod: Produto) => {
    setEditingProduct(prod);
    setTipo(prod.tipo || 'Produto');
    setNome(prod.nome);
    setMarca(prod.marca || '');
    setModelo(prod.modelo || '');
    setCondicao(prod.condicao || 'Novo');
    setNcm(prod.ncm || '');
    setValorCusto(prod.valorCusto !== undefined ? String(prod.valorCusto) : '');
    setValorFinal(prod.valorFinal !== undefined ? String(prod.valorFinal) : '');
    setIsAdding(true);
    setFormError(null);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingProduct(null);
    setTipo('Produto');
    setNome('');
    setMarca('');
    setModelo('');
    setCondicao('Novo');
    setNcm('');
    setValorCusto('');
    setValorFinal('');
    setFormError(null);
    localStorage.removeItem('draft_product_form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nome) {
      setFormError('Por favor, digite o nome do produto ou serviço.');
      return;
    }

    // Se for Produto, marca, modelo e NCM são exigidos
    if (tipo === 'Produto' && (!marca || !modelo || !ncm)) {
      setFormError('Por favor, preencha todos os campos obrigatórios do produto (Marca, Modelo e NCM).');
      return;
    }

    const finalMarca = tipo === 'Servico' ? (marca.trim() || 'Manutenção') : marca;
    const finalModelo = tipo === 'Servico' ? (modelo.trim() || 'Mão de obra') : modelo;
    const finalNcm = tipo === 'Servico' ? (ncm.trim() || '9901.12.00') : ncm; 
    const finalCondicao = condicao;

    const parsedValorCusto = valorCusto.trim() !== '' && !isNaN(parseFloat(valorCusto.replace(/\./g, '').replace(',', '.'))) 
      ? parseFloat(valorCusto.replace(/\./g, '').replace(',', '.')) 
      : undefined;
    const parsedValorFinal = valorFinal.trim() !== '' && !isNaN(parseFloat(valorFinal.replace(/\./g, '').replace(',', '.'))) 
      ? parseFloat(valorFinal.replace(/\./g, '').replace(',', '.')) 
      : undefined;

    const payload: Produto = {
      id: editingProduct ? editingProduct.id : Math.random().toString(36).substr(2, 9),
      nome,
      marca: finalMarca,
      modelo: finalModelo,
      condicao: finalCondicao,
      ncm: finalNcm,
      tipo,
      valorCusto: parsedValorCusto,
      valorFinal: parsedValorFinal,
    };

    if (editingProduct) {
      onUpdateProduct(payload);
      const updated = localProdutos.map(p => p.id === payload.id ? payload : p);
      setLocalProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
    } else {
      onAddProduct(payload);
      const updated = [...localProdutos, payload];
      setLocalProdutos(updated);
      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
    }
    closeForm();
  };

  const filteredProducts = (localProdutos || []).filter((p) => {
    const q = searchQuery.toLowerCase();
    const nomeOk = p.nome ? p.nome.toLowerCase().includes(q) : false;
    const marcaOk = p.marca ? p.marca.toLowerCase().includes(q) : false;
    const modeloOk = p.modelo ? p.modelo.toLowerCase().includes(q) : false;
    return nomeOk || marcaOk || modeloOk;
  });

  const productsOnly = filteredProducts.filter(p => !p.tipo || p.tipo === 'Produto');
  const servicesOnly = filteredProducts.filter(p => p.tipo === 'Servico');

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-50 min-h-[70vh]" id="products-tab">
      <AnimatePresence mode="wait">
        {!isAdding ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Header da Seção */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-800">SERVIÇOS E PRODUTOS</h2>
                <p className="text-xs text-slate-500">{localProdutos.length} cadastrados no inventário unificado</p>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center space-x-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Barra de Pesquisa e Toggles de Visualização */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar por nome, marca ou modelo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoCorrect="on"
                  spellCheck={true}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all shadow-sm"
                />
              </div>

              {/* Toggles de 3 Modos de Visualização para Itens */}
              <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-250/30'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Modo Lista Detalhada"
                >
                  <LayoutList size={13} />
                  <span>Lista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('large')}
                  className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase transition-all cursor-pointer ${
                    viewMode === 'large'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-250/30'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Modo Ícones Grandes"
                >
                  <Grid size={13} />
                  <span>Ícones G</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('small')}
                  className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase transition-all cursor-pointer ${
                    viewMode === 'small'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-250/30'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Modo Ícones Pequenos (Compacto)"
                >
                  <Grid size={11} className="scale-90" />
                  <span>Ícones P</span>
                </button>
              </div>
            </div>

            {/* Sub-abas de Visualização Separadas: Dois Botões Azuis-Claros Estilizados */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveListTab('produtos')}
                className={`py-3 px-3.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 border text-center ${
                  activeListTab === 'produtos'
                    ? 'bg-sky-100 text-sky-900 border-sky-400 shadow-md ring-2 ring-sky-300/30'
                    : 'bg-sky-50/40 text-sky-750 border-sky-200/60 hover:bg-sky-100/60'
                }`}
              >
                <span className="uppercase tracking-tight">Cadastro de Produtos e Itens</span>
                <span className="text-[10px] opacity-80 font-mono">({localProdutos.filter(p => !p.tipo || p.tipo === 'Produto').length} itens)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveListTab('servicos')}
                className={`py-3 px-3.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 border text-center ${
                  activeListTab === 'servicos'
                    ? 'bg-sky-100 text-sky-900 border-sky-400 shadow-md ring-2 ring-sky-300/30'
                    : 'bg-sky-50/40 text-sky-750 border-sky-200/60 hover:bg-sky-100/60'
                }`}
              >
                <span className="uppercase tracking-tight">Serviços Prestados</span>
                <span className="text-[10px] opacity-80 font-mono">({localProdutos.filter(p => p.tipo === 'Servico').length} cadastrados)</span>
              </button>
            </div>

            {/* Lista de Itens */}
            <div>
              {(activeListTab === 'produtos' ? productsOnly : servicesOnly).length > 0 ? (
                (() => {
                  const itemsList = activeListTab === 'produtos' ? productsOnly : servicesOnly;

                  if (viewMode === 'list') {
                    return (
                      <div className="space-y-2.5">
                        {itemsList.map((p) => {
                          const isServico = p.tipo === 'Servico';
                          return (
                            <div
                              key={p.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between space-x-4 text-left"
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      isServico
                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                        : 'bg-sky-50 text-sky-600 border border-sky-100'
                                    }`}
                                  >
                                    {isServico ? 'Serviço' : 'Produto'}
                                  </span>
                                  {p.condicao && p.condicao.trim() !== '' && (
                                    <span
                                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        p.condicao === 'Novo'
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                          : p.condicao === 'Seminovo'
                                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                          : p.condicao === 'Usado'
                                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                          : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                                      }`}
                                    >
                                      {p.condicao}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">NCM {p.ncm}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{p.nome}</h3>
                                <p className="text-xs text-zinc-500 font-medium">
                                  {p.marca} • {p.modelo}
                                </p>
                                <div className="flex items-center space-x-3 mt-1">
                                  {p.valorCusto !== undefined && (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Custo: <strong className="text-slate-700 font-extrabold">{p.valorCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                    </span>
                                  )}
                                  {p.valorFinal !== undefined && (
                                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                                      Venda: <strong className="text-sky-900 font-extrabold">{p.valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                {deletingId === p.id ? (
                                  <div className="flex items-center space-x-1 bg-red-50 border border-red-100 rounded-xl p-1 animate-pulse">
                                    <span className="text-[9px] text-red-700 font-bold px-1 uppercase">Excluir?</span>
                                    <button
                                      onClick={() => {
                                        onDeleteProduct(p.id);
                                        const updated = localProdutos.filter(item => item.id !== p.id);
                                        setLocalProdutos(updated);
                                        localStorage.setItem('orcaplus_products', JSON.stringify(updated));
                                        setDeletingId(null);
                                      }}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] rounded-lg shadow-sm cursor-pointer"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      onClick={() => setDeletingId(null)}
                                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[9px] rounded-lg cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEdit(p)}
                                      className="p-1.5 bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-100 transition cursor-pointer"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => setDeletingId(p.id)}
                                      className="p-1.5 bg-red-50 text-red-500 hover:text-red-700 rounded-lg border border-red-100 transition cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else if (viewMode === 'large') {
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                        {itemsList.map((p) => {
                          const isServico = p.tipo === 'Servico';
                          return (
                            <div
                              key={p.id}
                              className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden space-y-3.5"
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl" />
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
                              
                              <div className="space-y-2.5 pl-2">
                                <div className="flex items-center justify-between font-mono text-[9px]">
                                  <span
                                    className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      isServico
                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                        : 'bg-sky-50 text-sky-600 border border-sky-100'
                                    }`}
                                  >
                                    {isServico ? 'Serviço' : 'Produto'}
                                  </span>
                                  {p.condicao && p.condicao.trim() !== '' && (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                      {p.condicao}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-0.5">
                                  <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate">
                                    {p.nome}
                                  </h3>
                                  <p className="text-[10px] text-zinc-400 font-bold">
                                    {p.marca} • {p.modelo}
                                  </p>
                                </div>

                                <div className="bg-slate-50/70 p-2 rounded-xl space-y-1 text-xs">
                                  {p.valorCusto !== undefined && (
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-zinc-450">Custo</span>
                                      <span className="font-extrabold text-zinc-600">{p.valorCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                  )}
                                  {p.valorFinal !== undefined && (
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-sky-700 font-extrabold">Venda</span>
                                      <span className="font-black text-sky-900">{p.valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pl-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                {deletingId === p.id ? (
                                  <div className="flex items-center space-x-1 bg-red-50 border border-red-100 rounded-lg p-1 animate-pulse">
                                    <button
                                      onClick={() => {
                                        onDeleteProduct(p.id);
                                        const updated = localProdutos.filter(item => item.id !== p.id);
                                        setLocalProdutos(updated);
                                        localStorage.setItem('orcaplus_products', JSON.stringify(updated));
                                        setDeletingId(null);
                                      }}
                                      className="px-2 py-0.5 bg-red-600 text-white font-semibold text-[9px] rounded"
                                    >
                                      Sim
                                    </button>
                                    <button onClick={() => setDeletingId(null)} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] rounded">Não</button>
                                  </div>
                                ) : (
                                  <>
                                    <button onClick={() => startEdit(p)} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 cursor-pointer">Editar</button>
                                    <button onClick={() => setDeletingId(p.id)} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg cursor-pointer">Excluir</button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    // viewMode === 'small' (compact)
                    return (
                      <div className="grid grid-cols-2 gap-2 text-left">
                        {itemsList.map((p) => {
                          const isServico = p.tipo === 'Servico';
                          return (
                            <div
                              key={p.id}
                              className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden space-y-2"
                            >
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
                              <div className="pl-1 space-y-1">
                                <span className="text-[7.5px] uppercase font-black tracking-wide text-zinc-450">
                                  {isServico ? 'Serviço' : 'Produto'}
                                </span>
                                <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight truncate" title={p.nome}>
                                  {p.nome}
                                </h4>
                                <div className="text-[11px] font-black text-indigo-950 leading-none">
                                  {p.valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                </div>
                              </div>

                              <div className="pl-1 pt-1.5 border-t border-slate-50 flex justify-end gap-1">
                                {deletingId === p.id ? (
                                  <button
                                    onClick={() => {
                                      onDeleteProduct(p.id);
                                      const updated = localProdutos.filter(item => item.id !== p.id);
                                      setLocalProdutos(updated);
                                      localStorage.setItem('orcaplus_products', JSON.stringify(updated));
                                      setDeletingId(null);
                                    }}
                                    className="px-1.5 bg-red-600 text-white text-[8px] font-bold rounded"
                                  >
                                    Sim
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => startEdit(p)} className="p-1 bg-slate-50 hover:bg-slate-150 text-slate-600 rounded cursor-pointer"><Edit2 size={9} /></button>
                                    <button onClick={() => setDeletingId(p.id)} className="p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded cursor-pointer"><Trash2 size={9} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2 shadow-sm">
                  <ShoppingBag className="mx-auto text-slate-300" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Nenhum item cadastrado</p>
                  <p className="text-xs text-slate-500">
                    {searchQuery ? 'Tente ajustar sua palavra-chave.' : `Adicione ${activeListTab} acima.`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
          >
            {/* Header de Criação/Edição */}
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <button
                onClick={closeForm}
                className="p-2 bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingProduct ? 'Editar Item' : 'Cadastrar Produto/Serviço'}
                </h2>
                <p className="text-[11px] text-slate-400">Insira as especificações no banco local</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center space-x-1.5 mb-2 animate-pulse">
                  <span>⚠️ {formError}</span>
                </div>
              )}
              <div className="space-y-3">
                {/* Tipo de Cadastro */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Tipo de Cadastro *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('Produto');
                        if (condicao === '') {
                          setCondicao('Novo');
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                        tipo === 'Produto'
                          ? 'bg-slate-200 border-slate-300 text-black shadow-md'
                          : 'bg-slate-50 border-slate-200 text-black hover:bg-slate-100'
                      }`}
                    >
                      PRODUTO / MERCADORIA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('Servico');
                        if (condicao === 'Novo') {
                          setCondicao('');
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                        tipo === 'Servico'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      SERVIÇO
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {tipo === 'Produto' ? 'Nome do Produto / Item (Venda) *' : 'Nome do Serviço / Atividade prestada *'}
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoCorrect="on"
                    spellCheck={true}
                    placeholder=""
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {tipo === 'Produto' ? 'Marca / Fabricante *' : 'Marca / Fornecedor (Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      required={tipo === 'Produto'}
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {tipo === 'Produto' ? 'Modelo / Chassis *' : 'Modelo / Equipamento (Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      required={tipo === 'Produto'}
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {tipo === 'Produto' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Condição *</label>
                      <select
                        value={condicao}
                        onChange={(e) => setCondicao(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      >
                        <option value="Novo">Novo</option>
                        <option value="Seminovo">Seminovo</option>
                        <option value="Usado">Usado</option>
                        <option value="Recondicionado">Recondicionado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Código NCM *</label>
                      <input
                        type="text"
                        value={ncm}
                        onChange={(e) => setNcm(e.target.value)}
                        required
                        autoCorrect="on"
                        spellCheck={true}
                        placeholder=""
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Condição do Serviço</label>
                    <input
                      type="text"
                      value={condicao}
                      onChange={(e) => setCondicao(e.target.value)}
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor de Custo (R$)</label>
                    <input
                      type="text"
                      value={valorCusto}
                      onChange={(e) => setValorCusto(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Final (R$)</label>
                    <input
                      type="text"
                      value={valorFinal}
                      onChange={(e) => setValorFinal(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {tipo === 'Produto' && (
                <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 flex items-start space-x-2">
                  <HelpCircle size={16} className="text-sky-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-sky-700 leading-normal">
                    <strong>O que é NCM?</strong> A Nomenclatura Comum do Mercosul é obrigatória em orçamentos comerciais no Brasil. Drones geralmente se enquadram em <strong>8806.92.00</strong>, e pilhas/baterias de lítio em <strong>8507.60.00</strong>.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-700 bg-white rounded-xl font-semibold text-xs active:scale-95 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs active:scale-95 transition"
                >
                  {editingProduct ? 'Salvar Edições' : 'Salvar no Catálogo'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
