import React from 'react';
import { Orcamento, CompanySettings } from '../types';
import { X, Download, Printer, Percent, ShieldCheck, MapPin, Mail, Phone, Calendar, Hash, FileCheck2 } from 'lucide-react';
import { motion } from 'motion/react';
import { gerarOrcamentoPDF } from '../utils/pdfGenerator';

interface BudgetPreviewModalProps {
  orcamento: Orcamento;
  empresa: CompanySettings;
  onClose: () => void;
}

export default function BudgetPreviewModal({ orcamento, empresa, onClose }: BudgetPreviewModalProps) {
  
  const handleDownload = () => {
    gerarOrcamentoPDF(orcamento, empresa);
  };

  const formattedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-2 sm:p-4 overflow-y-auto select-text" id="budget-preview-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative"
      >
        {/* MODAL HEADER CONTROLS */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <span className="p-1 px-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md text-[10px] font-black tracking-widest uppercase">
              Visualização Prévia
            </span>
            <span className="text-white font-bold text-xs sm:text-sm">
              Proposta #{orcamento.numero} • {orcamento.clienteNome}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE CONTAINER SIMULATING PAPER) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/30 flex justify-center">
          
          {/* SIMULATED PRINT SHEET (A4 STYLE) */}
          <div className="bg-white text-slate-800 w-full max-w-3xl p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col space-y-6 text-xs sm:text-sm shadow-[0_4px_30px_rgba(0,0,0,0.15)] leading-relaxed">
            
            {/* 1. EMITENTE HEADER (Logo + Info) */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-5 gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden bg-white p-1 flex-shrink-0">
                  {empresa.logo ? (
                    <img src={empresa.logo} alt="Logo Empresa" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Logo</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight uppercase">
                    {empresa.razaoSocial || empresa.nomeFantasia}
                  </h3>
                  {empresa.nomeFantasia && empresa.nomeFantasia !== empresa.razaoSocial && (
                    <p className="text-[11px] text-slate-500 font-medium">Nome Fantasia: {empresa.nomeFantasia}</p>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold">CNPJ: {empresa.cnpj}</p>
                </div>
              </div>

              <div className="text-left sm:text-right text-[10px] sm:text-xs text-slate-500 space-y-0.5 font-medium">
                <p className="flex sm:justify-end items-center gap-1">
                  <MapPin size={11} className="text-slate-400" />
                  <span>{empresa.endereco}</span>
                </p>
                <p className="flex sm:justify-end items-center gap-1">
                  <Mail size={11} className="text-slate-400" />
                  <span>{empresa.email}</span>
                </p>
                <p className="flex sm:justify-end items-center gap-1">
                  <Phone size={11} className="text-slate-400" />
                  <span>{empresa.telefone}</span>
                </p>
                {empresa.cep && <p className="text-[10px] text-slate-400 font-semibold">CEP: {empresa.cep}</p>}
              </div>
            </div>

            {/* 2. ORÇAMENTO IDENTIFICATION BAR */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[9px] font-black text-sky-600 tracking-widest uppercase">Documento de Orçamento</span>
                <h4 className="text-slate-900 font-black text-sm sm:text-base">NÚMERO DA PROPOSTA: #{orcamento.numero}</h4>
              </div>
              <div className="text-[11px] text-slate-500 text-left sm:text-right font-medium">
                <p className="flex items-center gap-1 sm:justify-end">
                  <Calendar size={12} className="text-slate-400" />
                  <span>Gerado em: {formattedDate(orcamento.dataCriacao)}</span>
                </p>
                <p className="text-[10px] text-slate-400">Validade comercial: 15 dias</p>
              </div>
            </div>

            {/* 3. DESTINATÁRIO (CLIENTE) DETAILS */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center space-x-1.5">
                <span className="w-1.5 h-3 bg-slate-800 rounded-sm" />
                <span>Dados do Cliente / Solicitante</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-600 font-medium">
                <div>
                  <span className="text-slate-400 font-semibold">Nome/Empresa:</span>
                  <span className="text-slate-850 pl-1.5 block sm:inline font-bold text-slate-800">{orcamento.clienteNome}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Documento (CPF/CNPJ):</span>
                  <span className="text-slate-850 pl-1.5 block sm:inline text-slate-800">{orcamento.clienteDocumento}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">E-mail de Contato:</span>
                  <span className="text-slate-850 pl-1.5 block sm:inline text-slate-850">{orcamento.clienteEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Endereço Completo:</span>
                  <span className="text-slate-850 pl-1.5 block sm:inline text-slate-800 leading-normal">{orcamento.clienteEndereco}</span>
                </div>
              </div>
            </div>

            {/* 4. ITENS DO ORÇAMENTO TABLE */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center space-x-1.5">
                <span className="w-1.5 h-3 bg-slate-800 rounded-sm" />
                <span>Detalhamento dos Itens de Peças e Serviços</span>
              </h5>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg text-center w-8">#</th>
                      <th className="py-2.5 px-3">Especificações do Item</th>
                      <th className="py-2.5 px-2 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Unitário</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {orcamento.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/55">
                        <td className="py-3 px-3 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                        <td className="py-3 px-3 space-y-0.5">
                          <p className="font-bold text-slate-800">{item.nome}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                            {item.marca && `Marca: ${item.marca}`}
                            {item.modelo && ` • Modelo: ${item.modelo}`}
                            {item.condicao && ` • Condição: ${item.condicao}`}
                            {item.ncm && ` • NCM: ${item.ncm}`}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-800 font-bold">{item.quantidade}</td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. TOTALS AND METRICS BOX */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch border-t border-slate-100 pt-4 gap-4">
              <div className="flex-1 bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-xl space-y-1.5 font-medium">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Condições Comerciais</span>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-800">Tempo de Garantia:</strong> {orcamento.tempoGarantia}
                </p>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-800">Prazo de Execução/Entrega:</strong> {orcamento.tempoExecucao}
                </p>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-800">Condições de Pagamento:</strong> {orcamento.condicoesPagamento}
                </p>
              </div>

              <div className="w-full sm:w-64 bg-slate-800 text-white rounded-xl p-3 sm:p-4 flex flex-col justify-center space-y-1">
                <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider">TOTAL DA PROPOSTA</span>
                <p className="text-[10px] text-slate-300">Todas as taxas, impostos e fretes inclusos</p>
                <h4 className="text-xl sm:text-2xl font-black text-sky-400">
                  {orcamento.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h4>
              </div>
            </div>

            {/* 6. CORPO DE DETALHES DE OBSERVAÇÃO */}
            {orcamento.observacoes && (
              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-900 font-medium rounded-xl text-[11px] leading-relaxed space-y-1">
                <strong className="text-xs block text-slate-700 uppercase tracking-wider">Laudo do Equipamento / Detalhes de Diagnóstico:</strong>
                <p className="text-amber-800 whitespace-pre-wrap">{orcamento.observacoes}</p>
              </div>
            )}

            {/* 7. ASSINATURAS (SIGNATURE LINES FOR LEGAL ISSUES) */}
            <div className="grid grid-cols-2 gap-8 pt-12 text-center text-[10px] sm:text-xs">
              <div className="space-y-1.5">
                <div className="border-t border-slate-300 w-full pt-1.5 font-semibold text-slate-600">
                  {empresa.razaoSocial || empresa.nomeFantasia}
                </div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Emitente Autorizado</span>
              </div>
              <div className="space-y-1.5">
                <div className="border-t border-slate-300 w-full pt-1.5 font-semibold text-slate-600">
                  {orcamento.clienteNome}
                </div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Aceite de Proposta / Cliente</span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="text-center text-[9px] text-slate-400 uppercase tracking-widest font-bold pt-4 border-t border-slate-50 flex items-center justify-center space-x-1.5">
              <FileCheck2 size={12} className="text-sky-500" />
              <span>Vista Aérea Drones • Impressão Certificada</span>
            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-800 cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir Direto</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </motion.div>
    </div>
  );
}
