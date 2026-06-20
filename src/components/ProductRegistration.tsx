import React, { useState, useEffect } from 'react';
import { Produto } from '../types';
import { ShoppingBag, Search, Edit2, Trash2, Tag, Layers, Settings, Plus, ArrowLeft, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductRegistrationProps {
  produtos: Produto[];
  onAddProduct: (produto: Produto) => void;
  onUpdateProduct: (produto: Produto) => void;
  onDeleteProduct: (id: string) => void;
}

export default function ProductRegistration({
  produtos,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductRegistrationProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
  const [condicao, setCondicao] = useState<'Novo' | 'Seminovo' | 'Usado' | 'Recondicionado'>('Novo');
  const [ncm, setNcm] = useState('');

  const startEdit = (prod: Produto) => {
    setEditingProduct(prod);
    setTipo(prod.tipo || 'Produto');
    setNome(prod.nome);
    setMarca(prod.marca || '');
    setModelo(prod.modelo || '');
    setCondicao(prod.condicao || 'Novo');
    setNcm(prod.ncm || '');
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
    setFormError(null);
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
    const finalCondicao = tipo === 'Servico' ? 'Novo' : condicao;

    const payload: Produto = {
      id: editingProduct ? editingProduct.id : Math.random().toString(36).substr(2, 9),
      nome,
      marca: finalMarca,
      modelo: finalModelo,
      condicao: finalCondicao,
      ncm: finalNcm,
      tipo,
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

            {/* Barra de Pesquisa */}
            <div className="relative">
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
            <div className="space-y-2.5">
              {(activeListTab === 'produtos' ? productsOnly : servicesOnly).length > 0 ? (
                (activeListTab === 'produtos' ? productsOnly : servicesOnly).map((p) => {
                  const isServico = p.tipo === 'Servico';
                  return (
                    <div
                      key={p.id}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between space-x-4"
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
                          {!isServico && (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                p.condicao === 'Novo'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : p.condicao === 'Seminovo'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : p.condicao === 'Usado'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
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
                              className="p-1.5 bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-100 transition"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingId(p.id)}
                              className="p-1.5 bg-red-50 text-red-500 hover:text-red-700 rounded-lg border border-red-100 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
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
                      onClick={() => setTipo('Produto')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                        tipo === 'Produto'
                          ? 'bg-slate-850 border-slate-800 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      PRODUTO / MERCADORIA
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('Servico')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                        tipo === 'Servico'
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      SERVIÇO / PRESTAÇÃO
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

                <div className="grid grid-cols-2 gap-3">
                  {tipo === 'Produto' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Condição *</label>
                      <select
                        value={condicao}
                        onChange={(e) => setCondicao(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      >
                        <option value="Novo">Novo</option>
                        <option value="Seminovo">Seminovo</option>
                        <option value="Usado">Usado</option>
                        <option value="Recondicionado">Recondicionado</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Condição do Serviço</label>
                      <input
                        type="text"
                        disabled
                        value="Serviço de Mão de obra"
                        className="w-full px-3 py-2 text-xs bg-slate-100 text-slate-400 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {tipo === 'Produto' ? 'Código NCM *' : 'Código NCM ou NBS (Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={ncm}
                      onChange={(e) => setNcm(e.target.value)}
                      required={tipo === 'Produto'}
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 flex items-start space-x-2">
                <HelpCircle size={16} className="text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-sky-700 leading-normal">
                  <strong>O que é NCM?</strong> A Nomenclatura Comum do Mercosul é obrigatória em orçamentos comerciais no Brasil. Drones geralmente se enquadram em <strong>8806.92.00</strong>, e pilhas/baterias de lítio em <strong>8507.60.00</strong>.
                </p>
              </div>

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
