import React from 'react';
import { CompanySettings, Cliente, Produto, Orcamento } from '../types';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  FileText,
  DollarSign,
  Plus,
  Eye,
  Download,
  ArrowRight,
  ArrowUpRight,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface DashboardProps {
  orcamentos: Orcamento[];
  clientes: Cliente[];
  produtos: Produto[];
  empresa: CompanySettings;
  onNavigate: (tab: 'dashboard' | 'orcamentos' | 'clientes' | 'produtos' | 'empresa', initialAction?: string) => void;
  onPreviewOrcamento: (orc: Orcamento) => void;
  onDownloadPDF: (orc: Orcamento) => void;
}

export default function Dashboard({
  orcamentos,
  clientes,
  produtos,
  empresa,
  onNavigate,
  onPreviewOrcamento,
  onDownloadPDF
}: DashboardProps) {
  // Math and stats calculations
  const totalBudgets = orcamentos.length;
  const totalRevenue = orcamentos.reduce((acc, current) => acc + (current.valorTotal || 0), 0);
  const totalClients = clientes.length;
  const totalProducts = produtos.length;
  const averageValue = totalBudgets > 0 ? totalRevenue / totalBudgets : 0;

  // Group budgets by Month for Chart
  const getChartData = () => {
    // Default mock template if no budgets are present or to show a nice trend
    if (orcamentos.length === 0) {
      return [
        { name: 'Jan', valor: 0, quantidade: 0 },
        { name: 'Fev', valor: 0, quantidade: 0 },
        { name: 'Mar', valor: 0, quantidade: 0 },
        { name: 'Abr', valor: 0, quantidade: 0 },
        { name: 'Mai', valor: 0, quantidade: 0 },
        { name: 'Jun', valor: 0, quantidade: 0 }
      ];
    }

    // Map month names in Portuguese
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Grouping by yyyy-mm
    const groups: { [key: string]: { valor: number; qtd: number } } = {};
    
    // Auto populate last 5 months
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      groups[key] = { valor: 0, qtd: 0 };
    }

    // Fill with real budget data
    orcamentos.forEach(orc => {
      try {
        const date = new Date(orc.dataCriacao);
        if (!isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (groups[key]) {
            groups[key].valor += orc.valorTotal;
            groups[key].qtd += 1;
          } else {
            // If older or future, initialize
            groups[key] = { valor: orc.valorTotal, qtd: 1 };
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Format for Recharts sorting keys ascending
    return Object.keys(groups)
      .sort()
      .map(key => {
        const [year, month] = key.split('-');
        const monthIndex = parseInt(month, 10) - 1;
        return {
          name: `${meses[monthIndex]}/${year.substring(2)}`,
          valor: parseFloat(groups[key].valor.toFixed(2)),
          quantidade: groups[key].qtd
        };
      });
  };

  const chartData = getChartData();

  // Get 3 recent budgets
  const recentBudgets = [...orcamentos]
    .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())
    .slice(0, 3);

  // Formatter for Currency
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6 pb-6" id="dashboard-tab">
      {/* Welcome Hero Area */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl border border-indigo-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -ml-6 -mb-6"></div>
        
        <div className="relative space-y-2">
          <span className="bg-sky-500/20 text-sky-300 border border-sky-400/20 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
            Painel Geral Vista Aérea
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">
            Olá, {empresa.nomeFantasia || 'Operador'}!
          </h2>
          <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
            Bem-vindo de volta ao seu centro de faturamento de filmagens e vistorias aéreas. Aqui está um resumo da sua atividade comercial.
          </p>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Faturamento */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Faturamento</span>
            <div className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center gap-0.5">
              <TrendingUp size={10} />
              <span>Geral</span>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black text-slate-800 leading-none">
              {formatBRL(totalRevenue)}
            </p>
            <p className="text-[10px] text-slate-400">Dos orçamentos emitidos</p>
          </div>
        </motion.div>

        {/* Total Orçamentos */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Orçamentos</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <FileText size={12} />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black text-slate-800 leading-none">
              {totalBudgets}
            </p>
            <p className="text-[10px] text-slate-400">Documentos gerados</p>
          </div>
        </motion.div>

        {/* Clientes Cadastrados */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Clientes</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users size={12} />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black text-slate-800 leading-none">
              {totalClients}
            </p>
            <p className="text-[10px] text-slate-400">Cadastros válidos</p>
          </div>
        </motion.div>

        {/* Itens do Catálogo */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Catálogo</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <ShoppingBag size={12} />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-black text-slate-800 leading-none">
              {totalProducts}
            </p>
            <p className="text-[10px] text-slate-400">Serviços e Produtos</p>
          </div>
        </motion.div>
      </div>

      {/* Grid de 2 Colunas (Gráficos vs Recentes) para telas grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Gráficos Info */}
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Fluxo Comercial de Emissões</h3>
              <p className="text-[10px] text-slate-400 font-medium">Balanço das propostas em R$ por período</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-black rounded border border-indigo-150 uppercase tracking-widest font-mono">
              Gráfico Ativo
            </span>
          </div>

          <div className="w-full h-56 select-none font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '8px', border: 'none', color: '#fff' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="valor" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorValor)" name="Faturamento (R$)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumos Recentes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Últimos Orçamentos Recentes</h3>
            <button
              onClick={() => onNavigate('orcamentos')}
              className="text-[10px] text-sky-600 font-black flex items-center gap-0.5 hover:underline uppercase tracking-wide cursor-pointer"
            >
              <span>Ver Todos</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[235px] overflow-y-auto pr-1">
            {recentBudgets.length > 0 ? (
              recentBudgets.map(orc => (
                <div
                  key={orc.id}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-[9px] font-black bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase">
                        #{orc.numero}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(orc.dataCriacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h4 className="text-[11px] font-bold text-slate-800 truncate">{orc.clienteNome}</h4>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {orc.items.length} {orc.items.length === 1 ? 'item' : 'itens'} • {formatBRL(orc.valorTotal)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => onPreviewOrcamento(orc)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-600 rounded-lg transition"
                      title="Visualizar proposta"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => onDownloadPDF(orc)}
                      className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition"
                      title="Baixar proposta"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-[10px]">
                Nenhum orçamento emitido no momento.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas de Operação */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Atalhos Operacionais Rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <button
            onClick={() => onNavigate('orcamentos', 'emitir')}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-150 rounded-xl transition text-left cursor-pointer group"
          >
            <div className="space-y-0.5">
              <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-indigo-900 leading-tight">Novo Orçamento</span>
              <span className="block text-[9px] text-slate-400 font-medium">Emitir documento PDF</span>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition" />
          </button>

          <button
            onClick={() => onNavigate('clientes', 'adicionar')}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-sky-50 border border-slate-100 hover:border-sky-150 rounded-xl transition text-left cursor-pointer group"
          >
            <div className="space-y-0.5">
              <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-sky-900 leading-tight">Cadastrar Cliente</span>
              <span className="block text-[9px] text-slate-400 font-medium">Novo registro na tabela</span>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-sky-600 transition" />
          </button>

          <button
            onClick={() => onNavigate('produtos', 'adicionar')}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-150 rounded-xl transition text-left cursor-pointer group"
          >
            <div className="space-y-0.5">
              <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-emerald-900 leading-tight">Novo Produto/Serviço</span>
              <span className="block text-[9px] text-slate-400 font-medium">Inventário e serviços</span>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition" />
          </button>

          <button
            onClick={() => onNavigate('empresa')}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-150 rounded-xl transition text-left cursor-pointer group"
          >
            <div className="space-y-0.5">
              <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-amber-950 leading-tight">Configurar Empresa</span>
              <span className="block text-[9px] text-slate-400 font-medium">Cnpj, endereço e logo</span>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-amber-700 transition" />
          </button>
        </div>
      </div>

      {/* Resumos Recentes removido para a nova bento grid */}
    </div>
  );
}
