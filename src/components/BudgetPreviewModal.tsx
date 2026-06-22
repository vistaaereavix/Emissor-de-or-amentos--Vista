import React from 'react';
import { Orcamento, CompanySettings } from '../types';
import { X, Download, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { gerarOrcamentoPDF } from '../utils/pdfGenerator';

interface BudgetPreviewModalProps {
  orcamento: Orcamento;
  empresa: CompanySettings;
  onClose: () => void;
}

// Formata CNPJ de acordo com a máscara oficial do Brasil XX.XXX.XXX/XXXX-XX
function formatarCNPJ(v: string): string {
  if (!v) return '';
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length !== 14) return v;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

// Formata data ISO para DD/MM/AAAA
function formatarData(dataIso: string): string {
  try {
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return '';
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return dataIso;
  }
}

export default function BudgetPreviewModal({ orcamento, empresa, onClose }: BudgetPreviewModalProps) {
  
  const handleDownload = async () => {
    await gerarOrcamentoPDF(orcamento, empresa);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-2 sm:p-4 overflow-y-auto select-text font-sans" id="budget-preview-modal">
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
              orçamento #{orcamento.numero} • {orcamento.clienteNome}
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
          
          {/* SIMULATED PRINT SHEET (A4 STYLE - PERFECT COPY OF COMPACT HTML BY USER) */}
          <div className="bg-white text-[#333] w-full max-w-3xl p-6 sm:p-10 rounded-2xl shadow-lg border border-slate-100 flex flex-col space-y-4 text-xs font-normal leading-relaxed relative">
            
            {/* CABEÇALHO DA EMPRESA */}
            <div className="border-b-2 border-[#333] pb-1.5">
              <table className="w-full border-none m-0">
                <tbody>
                  <tr className="border-none">
                    {empresa.logo && (
                      <td className="border-none p-0 pr-4 align-top w-[80px]">
                        <img 
                          src={empresa.logo} 
                          alt="Logo" 
                          referrerPolicy="no-referrer"
                          className="max-w-[72px] max-h-[48px] object-contain rounded border border-slate-100"
                        />
                      </td>
                    )}
                    <td className="border-none p-0 align-top text-left">
                      <h1 className="text-lg font-bold text-slate-950 uppercase m-0 leading-tight">
                        {empresa.nomeFantasia || 'Vista Aérea Drone LTDA'}
                      </h1>
                      <div className="text-[11px] text-[#333] space-y-0.5 mt-1 font-medium">
                        <p><strong>CNPJ:</strong> {formatarCNPJ(empresa.cnpj || '32216083000147')}</p>
                        <p>
                          <strong>End:</strong> {(() => {
                            let formatted = empresa.endereco || '';
                            if (empresa.numero) formatted += `, Nº ${empresa.numero}`;
                            if (empresa.complemento) formatted += ` - ${empresa.complemento}`;
                            if (empresa.cep) formatted += ` - CEP: ${empresa.cep}`;
                            return formatted || 'Sereia de Itapuã, Nº 81 - Itapuã - Vila Velha/ES - CEP: 29101-530';
                          })()}
                        </p>
                        <p><strong>Tel:</strong> {empresa.telefone || '(27) 98127-7344'} | <strong>E-mail:</strong> {empresa.email || 'vistaaereavix@gmail.com'}</p>
                      </div>
                    </td>
                    <td className="border-none p-0 align-middle text-right flex-shrink-0 min-w-[120px]">
                      <h2 className="text-[#555] font-bold text-base sm:text-lg m-0 leading-tight">
                        Orçamento #{orcamento.numero}
                      </h2>
                      <p className="text-xs text-[#333] font-bold m-0 mt-1">
                        Data: {formatarData(orcamento.dataCriacao)}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* DADOS DO CLIENTE */}
            <div>
              <div className="bg-[#f2f2f2] font-bold py-1 px-1.5 uppercase text-[11px] border-l-3 border-[#333] mb-1.5 tracking-tight">
                Dados do Cliente
              </div>
              <div className="text-[11px] font-medium text-[#333] space-y-0.5 pl-1">
                <p><strong>Razão Social:</strong> {orcamento.clienteNome}</p>
                <p>
                  <strong>CPF/CNPJ:</strong> {orcamento.clienteDocumento || 'Não informado'} |{' '}
                  <strong>E-mail:</strong> {orcamento.clienteEmail || 'Não informado'}{' '}
                  {orcamento.clienteTelefone && (
                    <>
                      | <strong>Telefone:</strong> {orcamento.clienteTelefone}
                    </>
                  )}
                </p>
                <p><strong>Endereço:</strong> {orcamento.clienteEndereco || 'Não informado'}</p>
              </div>
            </div>

            {/* PRODUTOS E SERVIÇOS DETALHADOS */}
            <div>
              <div className="bg-[#f2f2f2] font-bold py-1 px-1.5 uppercase text-[11px] border-l-3 border-[#333] mb-1.5 tracking-tight">
                Produtos e Serviços Detalhados
              </div>
              
              <table className="w-full text-left text-xs border-collapse border border-slate-300 mt-1">
                <thead>
                  <tr className="bg-[#f2f2f2] font-bold text-[#333]">
                    <th className="border border-slate-300 py-1.5 px-2 text-center w-[5%] font-bold">#</th>
                    <th className="border border-slate-300 py-1.5 px-2 w-[48%] font-bold">Descrição do Produto / Serviço</th>
                    <th className="border border-slate-300 py-1.5 px-2 text-center w-[10%] font-bold">Condição</th>
                    <th className="border border-slate-300 py-1.5 px-2 text-center w-[7%] font-bold">Qtd</th>
                    <th className="border border-slate-300 py-1.5 px-2 text-right w-[15%] font-bold">V. Unitário</th>
                    <th className="border border-slate-300 py-1.5 px-2 text-right w-[15%] font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="font-normal text-[#333]">
                  {orcamento.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-medium">{idx + 1}</td>
                      <td className="border border-slate-300 py-1.5 px-2 align-top">
                        <strong className="text-slate-900 font-bold">{item.nome}</strong>
                        <div className="text-[9.5px] text-[#666] mt-0.5 leading-tight font-medium">
                          {item.marca && `Marca: ${item.marca}`}
                          {item.marca && item.modelo ? ' | ' : ''}
                          {item.modelo && `Modelo: ${item.modelo}`}
                          {(item.marca || item.modelo) && item.ncm ? ' | ' : ''}
                          {item.ncm && `NCM: ${item.ncm}`}
                        </div>
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-medium">{item.condicao}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-medium">{item.quantidade}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-right text-slate-700 font-medium">
                        {item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-right text-slate-950 font-bold">
                        {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                  {/* TOTAL GERAL */}
                  <tr>
                    <td colSpan={5} className="border border-slate-300 py-2 px-2 text-right font-bold text-[#333]">
                      VALOR TOTAL:
                    </td>
                    <td className="border border-slate-300 py-2 px-2 text-right font-bold text-slate-950">
                      {orcamento.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CONDIÇÕES COMERCIAIS */}
            <div>
              <div className="bg-[#f2f2f2] font-bold py-1 px-1.5 uppercase text-[11px] border-l-3 border-[#333] mb-1.5 tracking-tight">
                Condições e Termos Comerciais
              </div>
              <div className="text-[11px] font-medium text-[#333] space-y-1 pl-1">
                <p><strong>Prazo de Garantia:</strong> {orcamento.tempoGarantia || 'Não informado'}</p>
                <p><strong>Condições de Pagamento:</strong> {orcamento.condicoesPagamento || 'Não informado'}</p>
                <p><strong>Tempo de Execução:</strong> {orcamento.tempoExecucao || 'Não informado'}</p>
              </div>
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <div className="bg-[#f2f2f2] font-bold py-1 px-1.5 uppercase text-[11px] border-l-3 border-[#333] mb-1.5 tracking-tight">
                Observações do Equipamento / Detalhes de Serviço
              </div>
              <div className="border border-slate-300 p-2 bg-[#fafafa] mt-1 text-[11px] font-medium text-[#333] rounded whitespace-pre-wrap leading-relaxed">
                {orcamento.observacoes || 'Nenhuma observação informada.'}
              </div>
            </div>

            {/* ASSINATURAS */}
            <div className="pt-2">
              <table className="w-full border-none m-0 bg-transparent">
                <tbody>
                  <tr className="border-none">
                    <td className="border-none p-0 w-1/2 text-center">
                      <div className="w-[80%] border-t border-[#333] mx-auto mt-7 mb-1" />
                      <strong className="text-[11px] font-bold text-[#333]">VISTA AÉREA DRONE LTDA</strong>
                    </td>
                    <td className="border-none p-0 w-1/2 text-center">
                      <div className="w-[80%] border-t border-[#333] mx-auto mt-7 mb-1" />
                      <strong className="text-[11px] font-bold text-[#333]">{orcamento.clienteNome}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER NOTE */}
            <div className="text-center text-[9px] text-slate-500 font-semibold pt-2">
              Este documento é uma proposta comercial de prestação de serviços/venda gerada digitalmente.
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
