import React, { useState } from 'react';
import { Cliente, Produto, Orcamento, OrcamentoItem, CompanySettings } from '../types';
import { FilePlus, FileText, Download, Trash, User, ShoppingCart, Plus, HelpCircle, LayoutList, Grid, Calendar, DollarSign, Clock, ShieldCheck, Clipboard, AlertCircle, Search, Eye, Edit2, Copy } from 'lucide-react';
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
  onUpdateOrcamento?: (orcamento: Orcamento) => void;
  initialIsGenerating?: boolean;
}

const parseCondicoesToTwoMethods = (str: string) => {
  if (!str) {
    return {
      metodo1: '',
      valor1: '',
      parcelas1: 3,
      metodo2: '',
      valor2: '',
      parcelas2: 3,
    };
  }

  const metodosList = [
    { label: 'Pix', keys: ['pix'] },
    { label: 'Dinheiro', keys: ['dinheiro', 'em dinheiro', 'cash'] },
    { label: 'Boleto', keys: ['boleto'] },
    { label: 'Débito', keys: ['débito', 'debito'] },
    { label: 'Crédito à Vista', keys: ['crédito à vista', 'credito a vista', 'crédito a vista', 'credito à vista'] },
    { label: 'Crédito Parcelado', keys: ['crédito parcelado', 'credito parcelado', 'parcelado'] },
  ];

  const rawParts = str.split(/\s+e\s+/i);
  
  const results = rawParts.map(part => {
    let foundMethod = '';
    for (const m of metodosList) {
      if (m.keys.some(k => part.toLowerCase().includes(k))) {
        foundMethod = m.label;
        break;
      }
    }

    let amount = '';
    const r$Match = part.match(/R\$\s*([\d.,]+)/i);
    if (r$Match) {
      amount = r$Match[1].trim();
    }

    let parcelas = 3;
    const xMatch = part.match(/(\d+)\s*x/i);
    if (xMatch) {
      parcelas = parseInt(xMatch[1]);
    }

    return { metodo: foundMethod, valor: amount, parcelas };
  });

  const m1 = results[0] || { metodo: '', valor: '', parcelas: 3 };
  const m2 = results[1] || { metodo: '', valor: '', parcelas: 3 };

  if (!m1.metodo && str) {
    if (str.toLowerCase().includes('pix')) {
      m1.metodo = 'Pix';
    } else if (str.toLowerCase().includes('vista')) {
      m1.metodo = 'Dinheiro';
    } else {
      m1.metodo = 'Dinheiro';
    }
  }

  return {
    metodo1: m1.metodo,
    valor1: m1.valor,
    parcelas1: m1.parcelas >= 2 && m1.parcelas <= 12 ? m1.parcelas : 3,
    metodo2: m2.metodo,
    valor2: m2.valor,
    parcelas2: m2.parcelas >= 2 && m2.parcelas <= 12 ? m2.parcelas : 3,
  };
};

export default function BudgetGenerator({
  clientes,
  produtos,
  orcamentos,
  empresa,
  onAddOrcamento,
  onDeleteOrcamento,
  onUpdateOrcamento,
  initialIsGenerating,
}: BudgetGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(initialIsGenerating || false);

  React.useEffect(() => {
    if (initialIsGenerating) {
      setIsGenerating(true);
    }
  }, [initialIsGenerating]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'large' | 'small'>('list');

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
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [metodoPag1, setMetodoPag1] = useState<string>('');
  const [valorPag1, setValorPag1] = useState<string>('');
  const [parcelasPag1, setParcelasPag1] = useState<number>(3);
  const [metodoPag2, setMetodoPag2] = useState<string>('');
  const [valorPag2, setValorPag2] = useState<string>('');
  const [parcelasPag2, setParcelasPag2] = useState<number>(3);
  const [observacoes, setObservacoes] = useState('');

  const [editingOrcamentoId, setEditingOrcamentoId] = useState<string | null>(null);

  // Carrega rascunho (draft) do orçamento do localStorage
  React.useEffect(() => {
    const savedDraft = localStorage.getItem('draft_budget_form');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.isGenerating) {
          setIsGenerating(true);
          setClienteId(draft.clienteId || '');
          setActiveItems(draft.activeItems || []);
          setSelectedProdutoId(draft.selectedProdutoId || '');
          setTempQuantidade(draft.tempQuantidade || 1);
          setTempPrecoUnitario(draft.tempPrecoUnitario || 0);
          setTempoGarantiaOption(draft.tempoGarantiaOption || '90 dias');
          setTempoGarantiaManual(draft.tempoGarantiaManual || '');
          setTempoExecucao(draft.tempoExecucao || '2 dias úteis');
          const rawCondicoes = draft.condicoesPagamento || '';
          setCondicoesPagamento(rawCondicoes);
          const parsed = parseCondicoesToTwoMethods(rawCondicoes);
          setMetodoPag1(parsed.metodo1);
          setValorPag1(parsed.valor1);
          setParcelasPag1(parsed.parcelas1);
          setMetodoPag2(parsed.metodo2);
          setValorPag2(parsed.valor2);
          setParcelasPag2(parsed.parcelas2);
          setObservacoes(draft.observacoes || '');
          if (draft.editingOrcamentoId) {
            setEditingOrcamentoId(draft.editingOrcamentoId);
          }
        }
      } catch (_) {}
    }
  }, []);

  // Salva rascunho (draft) do orçamento no localStorage sempre que mudar
  React.useEffect(() => {
    if (isGenerating) {
      const draft = {
        isGenerating,
        clienteId,
        activeItems,
        selectedProdutoId,
        tempQuantidade,
        tempPrecoUnitario,
        tempoGarantiaOption,
        tempoGarantiaManual,
        tempoExecucao,
        condicoesPagamento,
        observacoes,
        editingOrcamentoId
      };
      localStorage.setItem('draft_budget_form', JSON.stringify(draft));
    } else {
      localStorage.removeItem('draft_budget_form');
    }
  }, [
    isGenerating,
    clienteId,
    activeItems,
    selectedProdutoId,
    tempQuantidade,
    tempPrecoUnitario,
    tempoGarantiaOption,
    tempoGarantiaManual,
    tempoExecucao,
    condicoesPagamento,
    observacoes,
    editingOrcamentoId
  ]);

  // Atualiza as condições de pagamento em formato de string para salvar no banco/state
  React.useEffect(() => {
    const parts: string[] = [];
    if (metodoPag1) {
      const pStr = metodoPag1 === 'Crédito Parcelado' ? ` (${parcelasPag1}x)` : '';
      const vStr = valorPag1.trim() ? ` (R$ ${valorPag1})` : '';
      parts.push(`${metodoPag1}${pStr}${vStr}`);
    }
    if (metodoPag2) {
      const pStr = metodoPag2 === 'Crédito Parcelado' ? ` (${parcelasPag2}x)` : '';
      const vStr = valorPag2.trim() ? ` (R$ ${valorPag2})` : '';
      parts.push(`${metodoPag2}${pStr}${vStr}`);
    }
    setCondicoesPagamento(parts.join(' e '));
  }, [metodoPag1, valorPag1, parcelasPag1, metodoPag2, valorPag2, parcelasPag2]);

  // Função para retornar o próximo número sequencial formatado (ex: "0001", "0002", etc.)
  const getNextSequenceNumber = () => {
    if (!orcamentos || orcamentos.length === 0) return '0001';
    const numericValues = orcamentos.map(o => {
      const cleanNum = o.numero?.replace('#', '').trim() || '';
      const parsed = parseInt(cleanNum, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
    const maxNum = Math.max(0, ...numericValues);
    return String(maxNum + 1).padStart(4, '0');
  };

  // Função para limpar todos os campos do orçamento após envio ou cancelamento
  const limparTodosCamposOrcamento = () => {
    setEditingOrcamentoId(null);
    setClienteId('');
    setActiveItems([]);
    setSelectedProdutoId('');
    setTempQuantidade(1);
    setTempPrecoUnitario(0);
    setTempoGarantiaOption('90 dias');
    setTempoGarantiaManual('');
    setTempoExecucao('2 dias úteis');
    setCondicoesPagamento('');
    setMetodoPag1('');
    setValorPag1('');
    setParcelasPag1(3);
    setMetodoPag2('');
    setValorPag2('');
    setParcelasPag2(3);
    setObservacoes('');
    setIsGenerating(false);
    
    // Remove também o rascunho do localStorage
    localStorage.removeItem('draft_budget_form');
  };

  // Calcula o total parcial
  const totalParcial = activeItems.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);

  // Calcula se a soma dos valores das condições excede o total do orçamento
  const numericValor1 = parseFloat(valorPag1.replace(',', '.')) || 0;
  const numericValor2 = parseFloat(valorPag2.replace(',', '.')) || 0;
  const somaCondicoes = numericValor1 + numericValor2;
  const excedeTotal = somaCondicoes > (totalParcial + 0.01) && totalParcial > 0;

  // Sistema de subtração em tempo real para os métodos de pagamento
  const handleValorPag1Change = (valStr: string) => {
    // Permite digitação livre
    setValorPag1(valStr);
    
    if (metodoPag2 !== '') {
      const cleanStr = valStr.replace(',', '.');
      const numericVal = parseFloat(cleanStr);
      if (!isNaN(numericVal)) {
        const remaining = totalParcial - numericVal;
        setValorPag2(remaining > 0 ? Number(remaining.toFixed(2)).toString() : '0');
      } else if (valStr === '') {
        setValorPag2('');
      }
    }
  };

  const handleValorPag2Change = (valStr: string) => {
    setValorPag2(valStr);
    
    if (metodoPag1 !== '') {
      const cleanStr = valStr.replace(',', '.');
      const numericVal = parseFloat(cleanStr);
      if (!isNaN(numericVal)) {
        const remaining = totalParcial - numericVal;
        setValorPag1(remaining > 0 ? Number(remaining.toFixed(2)).toString() : '0');
      } else if (valStr === '') {
        setValorPag1('');
      }
    }
  };

  const handleMetodoPag1Change = (newMetodo: string) => {
    setMetodoPag1(newMetodo);
    if (!newMetodo) {
      setValorPag1('');
    } else {
      const cleanV2 = valorPag2.replace(',', '.');
      const numV2 = parseFloat(cleanV2);
      if (metodoPag2 !== '' && !isNaN(numV2)) {
        const remaining = totalParcial - numV2;
        setValorPag1(remaining > 0 ? Number(remaining.toFixed(2)).toString() : '0');
      } else if (!valorPag1 || valorPag1 === '0') {
        setValorPag1(totalParcial.toString());
      }
    }
  };

  const handleMetodoPag2Change = (newMetodo: string) => {
    setMetodoPag2(newMetodo);
    if (!newMetodo) {
      setValorPag2('');
    } else {
      const cleanV1 = valorPag1.replace(',', '.');
      const numV1 = parseFloat(cleanV1);
      if (metodoPag1 !== '' && !isNaN(numV1)) {
        const remaining = totalParcial - numV1;
        setValorPag2(remaining > 0 ? Number(remaining.toFixed(2)).toString() : '0');
      } else if (!valorPag2 || valorPag2 === '0') {
        const currentV1 = parseFloat(valorPag1.replace(',', '.')) || 0;
        const remainder = totalParcial - currentV1;
        setValorPag2(remainder > 0 ? Number(remainder.toFixed(2)).toString() : '0');
      }
    }
  };

  // Handlers para Edição/Duplicação
  const handleStartEdit = (orc: Orcamento) => {
    setEditingOrcamentoId(orc.id);
    setClienteId(orc.clienteId || '');
    setActiveItems(orc.items);
    if (['90 dias', '120 dias', '180 dias'].includes(orc.tempoGarantia)) {
      setTempoGarantiaOption(orc.tempoGarantia);
      setTempoGarantiaManual('');
    } else {
      setTempoGarantiaOption('manual');
      setTempoGarantiaManual(orc.tempoGarantia || '');
    }
    setTempoExecucao(orc.tempoExecucao);
    setCondicoesPagamento(orc.condicoesPagamento);
    const parsed = parseCondicoesToTwoMethods(orc.condicoesPagamento || '');
    setMetodoPag1(parsed.metodo1);
    setValorPag1(parsed.valor1);
    setParcelasPag1(parsed.parcelas1);
    setMetodoPag2(parsed.metodo2);
    setValorPag2(parsed.valor2);
    setParcelasPag2(parsed.parcelas2);
    setObservacoes(orc.observacoes);
    setIsGenerating(true);
  };

  const handleStartDuplicate = (orc: Orcamento) => {
    setEditingOrcamentoId(null);
    setClienteId(orc.clienteId || '');
    setActiveItems(orc.items.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) })));
    if (['90 dias', '120 dias', '180 dias'].includes(orc.tempoGarantia)) {
      setTempoGarantiaOption(orc.tempoGarantia);
      setTempoGarantiaManual('');
    } else {
      setTempoGarantiaOption('manual');
      setTempoGarantiaManual(orc.tempoGarantia || '');
    }
    setTempoExecucao(orc.tempoExecucao);
    setCondicoesPagamento(orc.condicoesPagamento);
    const parsed = parseCondicoesToTwoMethods(orc.condicoesPagamento || '');
    setMetodoPag1(parsed.metodo1);
    setValorPag1(parsed.valor1);
    setParcelasPag1(parsed.parcelas1);
    setMetodoPag2(parsed.metodo2);
    setValorPag2(parsed.valor2);
    setParcelasPag2(parsed.parcelas2);
    setObservacoes(orc.observacoes);
    setIsGenerating(true);
  };

  const handleCancelForm = () => {
    limparTodosCamposOrcamento();
  };

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
      // Usa o valor final do produto como sugestão automática
      setTempPrecoUnitario(prod.valorFinal !== undefined ? prod.valorFinal : 0);
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
      valorCusto: prod.valorCusto,
      valorFinal: prod.valorFinal,
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

  // Emite e salva o Orçamento
  const handleEmitirOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !activeCliente) {
      alert('Selecione o Cliente para o orçamento.');
      return;
    }

    if (activeItems.length === 0) {
      alert('Adicione pelo menos um produto ou serviço ao orçamento antes de emitir.');
      return;
    }

    if (!metodoPag1 && !metodoPag2) {
      alert('Selecione pelo menos uma forma de pagamento nas Condições de Pagamento.');
      return;
    }

    if (excedeTotal) {
      alert(`A soma dos valores das formas de pagamento (R$ ${somaCondicoes.toFixed(2)}) excede o valor total do orçamento (R$ ${totalParcial.toFixed(2)})! Por favor, ajuste os valores.`);
      return;
    }

    const garantiaFinal = tempoGarantiaOption === 'manual' ? tempoGarantiaManual : tempoGarantiaOption;

    if (editingOrcamentoId) {
      const orcOriginal = orcamentos.find(o => o.id === editingOrcamentoId);
      if (!orcOriginal) return;

      const updatedOrcamento: Orcamento = {
        ...orcOriginal,
        clienteId: activeCliente.id,
        clienteNome: activeCliente.nome,
        clienteDocumento: activeCliente.cpfCnpj,
        clienteEndereco: activeCliente.endereco,
        clienteEmail: activeCliente.email,
        clienteTelefone: activeCliente.telefone,
        items: activeItems,
        tempoGarantia: garantiaFinal || '90 dias (Padrão)',
        tempoExecucao: tempoExecucao || 'Imediato',
        condicoesPagamento: condicoesPagamento || 'A combinar',
        observacoes: observacoes || 'Nenhuma observação cadastrada.',
        valorTotal: totalParcial,
      };

      if (onUpdateOrcamento) {
        onUpdateOrcamento(updatedOrcamento);
      } else {
        onAddOrcamento(updatedOrcamento);
      }

      // Dispara a geração de PDF diretamente pelo iPhone
      await gerarOrcamentoPDF(updatedOrcamento, empresa);
      alert('Orçamento atualizado com sucesso!');
    } else {
      // Calcula próximo número sequencial estruturado de forma incremental e sem duplicação
      const numSeq = getNextSequenceNumber();

      const novoOrcamento: Orcamento = {
        id: Math.random().toString(36).substr(2, 9),
        numero: numSeq,
        clienteId: activeCliente.id,
        clienteNome: activeCliente.nome,
        clienteDocumento: activeCliente.cpfCnpj,
        clienteEndereco: activeCliente.endereco,
        clienteEmail: activeCliente.email,
        clienteTelefone: activeCliente.telefone,
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
      await gerarOrcamentoPDF(novoOrcamento, empresa);
    }

    // Reseta form usando a função dedicada de limpeza
    limparTodosCamposOrcamento();
  };

  // Trigger rápido do PDF para orçamentos antigos
  const handleDownloadPDF = async (orc: Orcamento) => {
    await gerarOrcamentoPDF(orc, empresa);
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
      clienteTelefone: activeCliente.telefone,
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

            {/* Barra de Pesquisa e Toggles de Visualização */}
            {orcamentos.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Pesquisar por cliente, data ou número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoCorrect="on"
                    spellCheck={true}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
                
                {/* Toggles de 3 Modos de Visualização */}
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
            )}

            {/* Listagem de Orçamentos no Histórico */}
            <div>
              {orcamentos.length > 0 ? (
                filteredOrcamentos.length > 0 ? (
                  (() => {
                    const sortedOrcamentos = [...filteredOrcamentos].sort(
                      (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
                    );

                    if (viewMode === 'list') {
                      return (
                        <div className="space-y-3">
                          {sortedOrcamentos.map((orc) => (
                            <div
                              key={orc.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden text-left"
                            >
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

                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => setPreviewOrcamento(orc)}
                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition shrink-0 cursor-pointer"
                                    title="Visualizar proposta"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadPDF(orc)}
                                    className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition shrink-0 cursor-pointer"
                                    title="Baixar proposta PDF"
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(orc)}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition shrink-0 cursor-pointer"
                                    title="Editar proposta"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleStartDuplicate(orc)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition shrink-0 cursor-pointer"
                                    title="Duplicar proposta"
                                  >
                                    <Copy size={14} />
                                  </button>
                                  {deletingId === orc.id ? (
                                    <div className="flex items-center space-x-1.5 bg-red-50 border border-red-100 rounded-lg p-1 animate-pulse z-10 shrink-0">
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
                                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition shrink-0 cursor-pointer"
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
                          ))}
                        </div>
                      );
                    } else if (viewMode === 'large') {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                          {sortedOrcamentos.map((orc) => (
                            <div
                              key={orc.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden space-y-3.5"
                            >
                              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl" />
                              <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-500" />
                              
                              <div className="space-y-2.5 pl-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                                    ORÇAMENTO #{orc.numero}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(orc.dataCriacao).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>

                                <div className="space-y-0.5">
                                  <h3 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-1">
                                    {orc.clienteNome}
                                  </h3>
                                  <p className="text-[9px] text-slate-400 font-mono">Qtd itens: {orc.items.length}</p>
                                </div>

                                <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80 flex justify-between items-center text-[11px]">
                                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Total</span>
                                  <span className="font-black text-indigo-900 text-sm">
                                    {orc.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              </div>

                              <div className="pl-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                <span className="text-[10px] text-zinc-400 font-semibold">{orc.items.length} {orc.items.length === 1 ? 'item' : 'itens'}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => setPreviewOrcamento(orc)} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition cursor-pointer" title="Ver"><Eye size={12} /></button>
                                  <button onClick={() => handleDownloadPDF(orc)} className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition cursor-pointer" title="PDF"><Download size={12} /></button>
                                  <button onClick={() => handleStartEdit(orc)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition cursor-pointer" title="Editar"><Edit2 size={12} /></button>
                                  <button onClick={() => setDeletingId(orc.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition cursor-pointer" title="Excluir"><Trash size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      // viewMode === 'small' compact icons mode
                      return (
                        <div className="grid grid-cols-2 gap-2 text-left">
                          {sortedOrcamentos.map((orc) => (
                            <div
                              key={orc.id}
                              className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden space-y-2"
                            >
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-400" />
                              <div className="pl-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black text-slate-500">#{orc.numero}</span>
                                  <span className="text-[8px] text-slate-400">
                                    {new Date(orc.dataCriacao).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                  </span>
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight truncate" title={orc.clienteNome}>
                                  {orc.clienteNome}
                                </h4>
                                <div className="text-[11px] font-black text-indigo-900 leading-none">
                                  {orc.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                </div>
                              </div>

                              <div className="pl-1 pt-1.5 border-t border-slate-50 flex justify-between items-center">
                                <span className="text-[8px] text-zinc-400 font-mono font-bold leading-none">{orc.items.length} it.</span>
                                <div className="flex gap-0.5">
                                  <button onClick={() => setPreviewOrcamento(orc)} className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition cursor-pointer" title="Ver"><Eye size={10} /></button>
                                  <button onClick={() => handleDownloadPDF(orc)} className="p-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-md transition cursor-pointer" title="PDF"><Download size={10} /></button>
                                  <button onClick={() => handleStartEdit(orc)} className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-md transition cursor-pointer" title="Editar"><Edit2 size={10} /></button>
                                  <button onClick={() => setDeletingId(orc.id)} className="p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-md transition cursor-pointer" title="Excluir"><Trash size={10} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  })()
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
                type="button"
                onClick={handleCancelForm}
                className="p-2 bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <LayoutList size={16} />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                  {editingOrcamentoId ? (
                    `Editar Orçamento #${orcamentos.find(o => o.id === editingOrcamentoId)?.numero}`
                  ) : (
                    <>
                      <span>Novo Orçamento</span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100 uppercase tracking-wide">
                        #{getNextSequenceNumber()}
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {editingOrcamentoId ? 'Altere as informações abaixo e atualize o documento' : 'Preencha os dados e gere o PDF na hora'}
                </p>
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
                      {produtos.map((p) => {
                        const priceLabel = p.valorFinal !== undefined
                          ? ` - ${p.valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                          : '';
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.marca}{priceLabel})
                          </option>
                        );
                      })}
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
                </div>

                {/* Condições de pagamento - Estilizado e Interativo (Estilo igual ao tempo de garantia) */}
                <div className="bg-slate-50 p-4 border border-slate-200/80 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Formas de Pagamento *
                    </label>
                    <span className="text-[10px] text-zinc-400 font-medium">Defina até 2 formas de pagamento</span>
                  </div>

                  {/* Primeira Forma de Pagamento */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-600">Forma de Pagamento Principal *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={metodoPag1}
                        onChange={(e) => handleMetodoPag1Change(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      >
                        <option value="">-- Selecione a forma principal --</option>
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Débito">Débito</option>
                        <option value="Crédito à Vista">Crédito à Vista</option>
                        <option value="Crédito Parcelado">Crédito Parcelado</option>
                      </select>

                      {metodoPag1 !== '' && (
                        <div className="flex gap-2 animate-fadeIn">
                          <input
                            type="text"
                            placeholder="Valor (R$)"
                            value={valorPag1}
                            onChange={(e) => handleValorPag1Change(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />

                          {metodoPag1 === 'Crédito Parcelado' && (
                            <select
                              value={parcelasPag1}
                              onChange={(e) => setParcelasPag1(Number(e.target.value))}
                              className="w-24 px-2 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
                            >
                              {Array.from({ length: 11 }, (_, i) => i + 2).map((num) => (
                                <option key={num} value={num}>
                                  {num}x
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Segunda Forma de Pagamento */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <label className="block text-[11px] font-semibold text-slate-600">Segunda Forma de Pagamento (Opcional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={metodoPag2}
                        onChange={(e) => handleMetodoPag2Change(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      >
                        <option value="">-- Nenhuma (vazio) --</option>
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Débito">Débito</option>
                        <option value="Crédito à Vista">Crédito à Vista</option>
                        <option value="Crédito Parcelado">Crédito Parcelado</option>
                      </select>

                      {metodoPag2 !== '' && (
                        <div className="flex gap-2 animate-fadeIn">
                          <input
                            type="text"
                            placeholder="Valor (R$)"
                            value={valorPag2}
                            onChange={(e) => handleValorPag2Change(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />

                          {metodoPag2 === 'Crédito Parcelado' && (
                            <select
                              value={parcelasPag2}
                              onChange={(e) => setParcelasPag2(Number(e.target.value))}
                              className="w-24 px-2 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
                            >
                              {Array.from({ length: 11 }, (_, i) => i + 2).map((num) => (
                                <option key={num} value={num}>
                                  {num}x
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alerta de estouro do parcial */}
                  {excedeTotal && (
                    <div className="mt-2 text-xs font-bold text-red-500 bg-red-50 p-2.5 border border-red-200 rounded-xl animate-fadeIn">
                      ⚠️ Atenção: A soma dos valores (R$ {somaCondicoes.toFixed(2)}) ultrapassa o limite total do orçamento de R$ {totalParcial.toFixed(2)}! Por favor, ajuste os valores.
                    </div>
                  )}

                  {condicoesPagamento && (
                    <div className="mt-3 text-xs font-semibold text-sky-600 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                      <span>Condição Resultante:</span>
                      <span className="text-slate-700 bg-white border border-slate-150 px-2 py-0.5 rounded font-medium">
                        {condicoesPagamento}
                      </span>
                    </div>
                  )}
                  {!metodoPag1 && !metodoPag2 && (
                    <p className="mt-2 text-[10px] text-amber-600">Nenhum método selecionado. Defina pelo menos uma condição básica.</p>
                  )}
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
                  disabled={activeItems.length === 0 || !clienteId || excedeTotal}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                    activeItems.length === 0 || !clienteId || excedeTotal
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 active:scale-98'
                  }`}
                >
                  <Eye size={15} />
                  <span>Visualizar Prévia da Proposta Comercial</span>
                </button>

                <button
                  type="submit"
                  disabled={activeItems.length === 0 || !clienteId || excedeTotal}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
                    activeItems.length === 0 || !clienteId || excedeTotal
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 active:scale-98'
                  }`}
                >
                  <Download size={15} />
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
