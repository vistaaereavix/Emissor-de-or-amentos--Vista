import React, { useState } from 'react';
import { Cliente, Produto, Orcamento, OrcamentoItem, CompanySettings } from '../types';
import { FilePlus, FileText, Download, Trash, User, ShoppingCart, Plus, HelpCircle, LayoutList, Calendar, DollarSign, Clock, ShieldCheck, Clipboard, AlertCircle, Search, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { gerarOrcamentoPDF } from '../utils/pdfGenerator';
import BudgetPreviewModal from './BudgetPreviewModal';

interface BudgetGeneratorProps {
  clientes: Cliente[];
  produtos: Produto[];
  orcamentos: Orcamento[];
  empresa: CompanySettings;
  onAddOrcamento: (orcamento: Orcamento) => void;
  onDeleteOrcamento: (id: string) => void;
}

export default function BudgetGenerator({
  clientes,
  produtos,
  orcamentos,
  empresa,
  onAddOrcamento,
  onDeleteOrcamento,
}: BudgetGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estado para controlar a exibição da visualização prévia
  const [previewOrcamento, setPreviewOrcamento] = useState<Orcamento | null>(null);

  // Estados do formulário de novo orçamento
  const [clienteId, setClienteId] = useState('');
  
  // Itens atualmente adicionados ao orçamento ativo
  const [activeItems, setActiveItems] = useState<OrcamentoItem[]>([]);
  
  // Seleção temporária de item para adicionar
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [tempQuantidade, setTempQuantidade] = useState<number>(1);
  const [tempPrecoUnitario, setTempPrecoUnitario] = useState<number>(0);
  
  // Campos de texto adicionais
  const [tempoGarantiaOption, setTempoGarantiaOption] = useState('90 dias');
  const [tempoGarantiaManual, setTempoGarantiaManual] = useState('');
  const [tempoExecucao, setTempoExecucao] = useState('2 dias úteis');
  const [condicoesPagamento, setCondicoesPagamento] = useState('À vista ou PIX');
  const [observacoes, setObservacoes] = useState('');

  // Busca o cliente selecionado
  const activeCliente = clientes.find(c => c.id === clienteId);

  // Filtra orçamentos com base no texto inserido (por nome do cliente, número ou data)
  const filteredOrcamentos = orcamentos.filter((orc) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    
    const nomeMatch = orc.clienteNome.toLowerCase().includes(query);
    const numeroMatch = orc.numero.toLowerCase().includes(query);
    
    try {
      const dataFormatada = new Date(orc.dataCriacao).toLocaleDateString('pt-BR');
      const dataMatch = dataFormatada.toLowerCase().includes(query);
      return nomeMatch || numeroMatch || dataMatch;
    } catch (e) {
      return nomeMatch || numeroMatch;
    }
  });

  // Quando o usuário seleciona um produto no dropdown, preenchemos o valor unitário estimado como 0 ou sugerido
  const handleProdutoSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProdutoId(val);
    
    // Sugestão de valor padrão caso queira adicionar rápido
    const prod = produtos.find(p => p.id === val);
    if (prod) {
      // Se houver algum esquema de preço, colocamos, senão deixamos 0 para preencher manual
      setTempPrecoUnitario(0);
    }
  };

  // Adiciona o item na lista do orçamento que está sendo criado
  const handleAddItem = () => {
    if (!selectedProdutoId) {
      alert('Selecione um produto/serviço do catálogo antes de adicionar.');
      return;
    }
    const prod = produtos.find(p => p.id === selectedProdutoId);
    if (!prod) return;

    if (tempQuantidade <= 0) {
      alert('A quantidade deve ser maior do que zero.');
      return;
    }

    if (tempPrecoUnitario < 0) {
      alert('O preço unitário não pode ser negativo.');
      return;
    }

    const newItem: OrcamentoItem = {
      id: Math.random().toString(36).substr(2, 9),
      produtoId: prod.id,
      nome: prod.nome,
      marca: prod.marca,
      modelo: prod.modelo,
      condicao: prod.condicao,
      ncm: prod.ncm,
      quantidade: tempQuantidade,
      precoUnitario: tempPrecoUnitario,
    };

    setActiveItems((prev) => [...prev, newItem]);
    
    // Reseta inputs temporários
    setSelectedProdutoId('');
    setTempQuantidade(1);
    setTempPrecoUnitario(0);
  };

  // Remove um item adicionado temporariamente
  const handleRemoveItem = (itemId: string) => {
    setActiveItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calcula o total parcial
  const totalParcial = activeItems.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);

  // Emite e salva o Orçamento
  const handleEmitirOrcamento = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !activeCliente) {
      alert('Selecione o Cliente para o orçamento.');
      return;
    }

    if (activeItems.length === 0) {
      alert('Adicione pelo menos um produto ou serviço ao orçamento antes de emitir.');
      return;
    }

    // Calcula próximo número sequencial (ex: 1001, 1002...)
    const numSeq = orcamentos.length > 0 
      ? String(Math.max(...orcamentos.map(o => parseInt(o.numero) || 1000)) + 1)
      : '1001';

    const garantiaFinal = tempoGarantiaOption === 'manual' ? tempoGarantiaManual : tempoGarantiaOption;

    const novoOrcamento: Orcamento = {
      id: Math.random().toString(36).substr(2, 9),
      numero: numSeq,
      clienteId: activeCliente.id,
      clienteNome: activeCliente.nome,
      clienteDocumento: activeCliente.cpfCnpj,
      clienteEndereco: activeCliente.endereco,
      clienteEmail: activeCliente.email,
      items: activeItems,
      tempoGarantia: garantiaFinal || '90 dias (Padrão)',
      tempoExecucao: tempoExecucao || 'Imediato',
      condicoesPagamento: condicoesPagamento || 'A combinar',
      observacoes: observacoes || 'Nenhuma observação cadastrada.',
      dataCriacao: new Date().toISOString(),
      valorTotal: totalParcial,
    };

    // Salva na lista
    onAddOrcamento(novoOrcamento);

    // Dispara a geração de PDF diretamente pelo iPhone
    gerarOrcamentoPDF(novoOrcamento, empresa);

    // Reseta form
    setClienteId('');
    setActiveItems([]);
    setTempoGarantiaOption('90 dias');
    setTempoGarantiaManual('');
    setTempoExecucao('2 dias úteis');
    setCondicoesPagamento('À vista ou PIX');
    setObservacoes('');
    setIsGenerating(false);
  };

  // Trigger rápido do PDF para orçamentos antigos
  const handleDownloadPDF = (orc: Orcamento) => {
    gerarOrcamentoPDF(orc, empresa);
  };

  // Prepara visualização de rascunho em tempo real
  const handlePreviewDraft = () => {
    if (!clienteId || !activeCliente) {
      alert('Selecione o Cliente para visualizar a prévia do orçamento.');
      return;
    }

    if (activeItems.length === 0) {
      alert('Adicione pelo menos um produto ou serviço para visualizar a prévia.');
      return;
    }

    const garantiaFinal = tempoGarantiaOption === 'manual' ? tempoGarantiaManual : tempoGarantiaOption;

    const draftOrcamento: Orcamento = {
      id: 'preview-draft',
      numero: 'RASCUNHO',
      clienteId: activeCliente.id,
      clienteNome: activeCliente.nome,
      clienteDocumento: activeCliente.cpfCnpj,
      clienteEndereco: activeCliente.endereco,
      clienteEmail: activeCliente.email,
      items: activeItems,
      tempoGarantia: garantiaFinal || '90 dias (Padrão)',
      tempoExecucao: tempoExecucao || 'Imediato',
      condicoesPagamento: condicoesPagamento || 'A combinar',
      observacoes: observacoes || 'Nenhuma observação cadastrada.',
      dataCriacao: new Date().toISOString(),
      valorTotal: totalParcial,
    };

    setPreviewOrcamento(draftOrcamento);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-50 min-h-[75vh]" id="budget-generator-tab">
      <AnimatePresence mode="wait">
        {!isGenerating ? (
          <motion.div
            key="history-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Header com botão de criar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Orçamentos Emitidos</h2>
                <p className="text-xs text-slate-500">{orcamentos.length} documentos salvos no iPhone</p>
              </div>
              <button
                onClick={() => setIsGenerating(true)}
                className="flex items-center space-x-1 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Emitir Novo</span>
              </button>
            </div>

            {/* Barra de Pesquisa */}
            {orcamentos.length > 0 && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar por cliente, data ou número de orçamento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoCorrect="on"
                  spellCheck={true}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            )}

            {/* Listagem de Orçamentos no Histórico */}
            <div className="space-y-3">
              {orcamentos.length > 0 ? (
                filteredOrcamentos.length > 0 ? (
                  [...filteredOrcamentos]
                    .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())
                    .map((orc) => (
                      <div
                        key={orc.id}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden"
                      >
                        {/* Cor lateral decorador */}
                        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-sky-500" />
                        
                        <div className="pl-2 flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-black tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                                ORÇAMENTO #{orc.numero}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(orc.dataCriacao).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">{orc.clienteNome}</h3>
                            <p className="text-xs text-slate-500">
                              {orc.items.length} {orc.items.length === 1 ? 'item' : 'itens'} no documento
                            </p>
                          </div>

                          {/* Botões rápidos */}
                          <div className="flex space-x-1">
                            <button
                              onClick={() => setPreviewOrcamento(orc)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition"
                              title="Visualizar proposta"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(orc)}
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition"
                              title="Baixar proposta PDF"
                            >
                              <Download size={14} />
                            </button>
                            {deletingId === orc.id ? (
                              <div className="flex items-center space-x-1.5 bg-red-50 border border-red-100 rounded-lg p-1 animate-pulse">
                                <span className="text-[10px] text-red-700 font-bold px-1 uppercase">Excluir?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteOrcamento(orc.id);
                                    setDeletingId(null);
                                  }}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] rounded cursor-pointer leading-none"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded cursor-pointer leading-none"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(orc.id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"
                                title="Remover proposta"
                              >
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="pl-2 pt-2 border-t border-slate-50 flex justify-between items-center text-xs">
                          <span className="text-slate-400">Total do documento</span>
                          <span className="font-black text-slate-800 text-sm">
                            {orc.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2 shadow-sm">
                    <Search className="mx-auto text-slate-300" size={32} />
                    <p className="text-sm font-semibold text-slate-700">Nenhum orçamento encontrado</p>
                    <p className="text-xs text-slate-500">
                      Tente ajustar o nome do cliente, data ou número digitado.
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2 shadow-sm">
                  <FileText className="mx-auto text-slate-300" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Nenhum orçamento emitido</p>
                  <p className="text-xs text-slate-500">
                    Toque no botão e preencha as informações para emitir o PDF.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="generator-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header de criação */}
            <div className="flex items-center space-x-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <button
                onClick={() => setIsGenerating(false)}
                className="p-2 bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <LayoutList size={16} />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-800">Novo Orçamento</h2>
                <p className="text-[11px] text-slate-400">Preencha os dados e gere o PDF na hora</p>
              </div>
            </div>

            <form onSubmit={handleEmitirOrcamento} className="space-y-4 pb-12">
              {/* 1. SELEÇÃO DO CLIENTE */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">
                  <User size={16} className="text-slate-500" />
                  <span>1. Selecionar Cliente</span>
                </div>

                <div className="space-y-1">
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">-- Selecione o cliente cadastrado --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.cpfCnpj})
                      </option>
                    ))}
                  </select>
                  {clientes.length === 0 && (
                    <p className="text-[11px] text-red-500 flex items-center space-x-1 mt-1">
                      <AlertCircle size={12} />
                      <span>Nenhum cliente cadastrado. Cadastre primeiro na aba "Clientes".</span>
                    </p>
                  )}
                </div>

                {activeCliente && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 space-y-1"
                  >
                    <p><strong>Nome:</strong> {activeCliente.nome}</p>
                    <p><strong>Documento:</strong> {activeCliente.cpfCnpj}</p>
                    <p><strong>Endereço:</strong> {activeCliente.endereco}</p>
                  </motion.div>
                )}
              </div>

              {/* 2. ADICIONAR PRODUTOS / SERVIÇOS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <ShoppingCart size={16} className="text-slate-500" />
                  <span>2. Produtos / Serviços do Orçamento</span>
                </div>

                {/* Selecionador no catálogo */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500">Escolha do Catálogo</label>
                    <select
                      value={selectedProdutoId}
                      onChange={handleProdutoSelectChange}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="">-- Escolha um item para adicionar --</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.marca} • NCM {p.ncm})
                        </option>
                      ))}
                    </select>
                    {produtos.length === 0 && (
                      <p className="text-[10px] text-amber-600">Catálogo vazio. Cadastre itens na aba "Produtos".</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        value={tempQuantidade}
                        onChange={(e) => setTempQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Valor Unitário</label>
                      <input
                        type="text"
                        autoCorrect="on"
                        spellCheck={true}
                        placeholder=""
                        value={tempPrecoUnitario === 0 ? '' : (() => {
                          const parts = tempPrecoUnitario.toFixed(2).split('.');
                          const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          const decimalPart = parts[1];
                          return `R$ ${integerPart},${decimalPart}`;
                        })()}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '');
                          const num = clean ? parseInt(clean, 10) / 100 : 0;
                          setTempPrecoUnitario(num);
                        }}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Adicionar no Orçamento</span>
                  </button>
                </div>

                {/* Lista de itens inseridos provisórios */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-500">Itens adicionados:</span>
                  {activeItems.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="font-bold text-slate-800 truncate">
                              {index + 1}. {item.nome}
                            </p>
                            <p className="text-slate-400 text-[10px]">
                              {item.quantidade}x • {item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un. NCM: {item.ncm}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-700">
                              {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 bg-red-50 rounded-md border border-red-100 transition"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Nenhum item adicionado à proposta comercial ainda.
                    </div>
                  )}
                </div>

                {/* Subtotal real-time */}
                {activeItems.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">Total do Orçamento:</span>
                    <span className="text-base font-black text-slate-800">
                      {totalParcial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. CONDIÇÕES GERAIS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider mb-1">
                  <Clipboard size={16} className="text-slate-500" />
                  <span>3. Condições Comerciais & Prazos</span>
                </div>

                {/* Tempo de Garantia */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tempo de Garantia *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={tempoGarantiaOption}
                      onChange={(e) => setTempoGarantiaOption(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    >
                      <option value="30 dias">30 dias</option>
                      <option value="90 dias">90 dias (Recomendado)</option>
                      <option value="180 dias">180 dias (6 meses)</option>
                      <option value="1 ano">1 ano</option>
                      <option value="manual">Definir Manualmente</option>
                    </select>

                    {tempoGarantiaOption === 'manual' && (
                      <input
                        type="text"
                        placeholder=""
                        value={tempoGarantiaManual}
                        onChange={(e) => setTempoGarantiaManual(e.target.value)}
                        required
                        autoCorrect="on"
                        spellCheck={true}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tempo de execução */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Prazo de Execução *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Clock size={14} />
                      </span>
                      <input
                        type="text"
                        required
                        value={tempoExecucao}
                        onChange={(e) => setTempoExecucao(e.target.value)}
                        placeholder=""
                        autoCorrect="on"
                        spellCheck={true}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Condições de pagamento */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Condições de Pagamento *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <DollarSign size={14} />
                      </span>
                      <input
                        type="text"
                        required
                        value={condicoesPagamento}
                        onChange={(e) => setCondicoesPagamento(e.target.value)}
                        placeholder=""
                        autoCorrect="on"
                        spellCheck={true}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações do Equipamento / Proposta */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Observações do Equipamento / Detalhes de Serviço
                  </label>
                  <textarea
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder=""
                    autoCorrect="on"
                    spellCheck={true}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Botões de Ação do Orçamento */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handlePreviewDraft}
                  disabled={activeItems.length === 0 || !clienteId}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                    activeItems.length === 0 || !clienteId
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 active:scale-98'
                  }`}
                >
                  <Eye size={15} />
                  <span>Visualizar Prévia da Proposta Comercial</span>
                </button>

                <button
                  type="submit"
                  disabled={activeItems.length === 0 || !clienteId}
                  className={`w-full py-3 text-white rounded-2xl font-black text-sm shadow-sm transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer ${
                    activeItems.length === 0 || !clienteId
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-slate-850 hover:bg-slate-950 shadow-md'
                  }`}
                >
                  <Download size={18} />
                  <span>Emitir PDF & Concluir Orçamento</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewOrcamento && (
          <BudgetPreviewModal
            orcamento={previewOrcamento}
            empresa={empresa}
            onClose={() => setPreviewOrcamento(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
