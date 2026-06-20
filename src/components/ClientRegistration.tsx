import React, { useState } from 'react';
import { Cliente } from '../types';
import { UserPlus, Search, Edit2, Trash2, Mail, MapPin, FileDigit, Plus, X, ArrowLeft, ShieldAlert, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatCpf(v: string) {
  const r = v.replace(/\D/g, '').slice(0, 11);
  if (r.length <= 3) return r;
  if (r.length <= 6) return `${r.slice(0, 3)}.${r.slice(3)}`;
  if (r.length <= 9) return `${r.slice(0, 3)}.${r.slice(3, 6)}.${r.slice(6)}`;
  return `${r.slice(0, 3)}.${r.slice(3, 6)}.${r.slice(6, 9)}-${r.slice(9)}`;
}

function formatCnpj(v: string) {
  const r = v.replace(/\D/g, '').slice(0, 14);
  if (r.length <= 2) return r;
  if (r.length <= 5) return `${r.slice(0, 2)}.${r.slice(2)}`;
  if (r.length <= 8) return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5)}`;
  if (r.length <= 12) return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}/${r.slice(8)}`;
  return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}/${r.slice(8, 12)}-${r.slice(12)}`;
}

function formatCpfCnpj(v: string) {
  const clean = v.replace(/\D/g, '');
  if (clean.length <= 11) {
    return formatCpf(v);
  } else {
    return formatCnpj(v);
  }
}

interface ClientRegistrationProps {
  clientes: Cliente[];
  onAddClient: (cliente: Cliente) => void;
  onUpdateClient: (cliente: Cliente) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientRegistration({
  clientes,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientRegistrationProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Estados dos inputs do formulário
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [email, setEmail] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [rg, setRg] = useState('');

  // Estados adicionais para carregamento automatizado de CNPJ
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjSearchSuccess, setCnpjSearchSuccess] = useState(false);

  const buscarCNPJ = async (cnpjValue: string) => {
    const cleaned = cnpjValue.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      setCnpjError('Insira um CNPJ válido com 14 dígitos.');
      return;
    }

    setLoadingCnpj(true);
    setCnpjError(null);
    setCnpjSearchSuccess(false);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
      if (!response.ok) {
        throw new Error('Erro ao consultar CNPJ');
      }
      const data = await response.json();

      if (data.razao_social) {
        setNome(data.razao_social);
      } else if (data.nome_fantasia) {
        setNome(data.nome_fantasia);
      }

      if (data.email) {
        setEmail(data.email);
      }

      const parts = [
        data.logradouro,
        data.numero ? `Nº ${data.numero}` : '',
        data.complemento ? `(${data.complemento})` : '',
        data.bairro,
        data.municipio ? `${data.municipio}/${data.uf}` : '',
        data.cep ? `CEP: ${data.cep}` : ''
      ].filter(Boolean);

      if (parts.length > 0) {
        setEndereco(parts.join(' - '));
      }

      setCnpjSearchSuccess(true);
      setTimeout(() => setCnpjSearchSuccess(false), 2500);
    } catch (_) {
      setCnpjError('CNPJ não encontrado. Verifique os dígitos.');
    } finally {
      setLoadingCnpj(false);
    }
  };

  // Preenche formulário para edição
  const startEdit = (cliente: Cliente) => {
    setEditingClient(cliente);
    setNome(cliente.nome);
    setCpfCnpj(cliente.cpfCnpj);
    setEndereco(cliente.endereco);
    setEmail(cliente.email);
    setInscricaoEstadual(cliente.inscricaoEstadual);
    setRg(cliente.rg);
    setIsAdding(true);
    setFormError(null);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingClient(null);
    // Limpar campos
    setNome('');
    setCpfCnpj('');
    setEndereco('');
    setEmail('');
    setInscricaoEstadual('');
    setRg('');
    setCnpjError(null);
    setLoadingCnpj(false);
    setCnpjSearchSuccess(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nome || !cpfCnpj || !endereco || !email) {
      setFormError('Por favor, preencha todos os campos obrigatórios (Razão Social/Nome, CPF/CNPJ, Endereço e E-mail).');
      return;
    }

    const payload: Cliente = {
      id: editingClient ? editingClient.id : Math.random().toString(36).substr(2, 9),
      nome,
      cpfCnpj,
      endereco,
      email,
      inscricaoEstadual: inscricaoEstadual || 'Isento',
      rg: rg || 'Não informado',
    };

    if (editingClient) {
      onUpdateClient(payload);
    } else {
      onAddClient(payload);
    }
    closeForm();
  };

  // Filtra clientes
  const filteredClients = (clientes || []).filter((c) => {
    const q = searchQuery.toLowerCase();
    const nomeOk = c.nome ? c.nome.toLowerCase().includes(q) : false;
    const cpfCnpjOk = c.cpfCnpj ? c.cpfCnpj.includes(searchQuery) : false;
    return nomeOk || cpfCnpjOk;
  });

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-50 min-h-[70vh]" id="clients-tab">
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
                <h2 className="text-lg font-bold text-slate-800">Clientes cadastrados</h2>
                <p className="text-xs text-slate-500">{clientes.length} clientes na memória local</p>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center space-x-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Novo Cliente</span>
              </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Pesquisar por nome ou CPF/CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoCorrect="on"
                spellCheck={true}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            {/* Lista dos Clientes */}
            <div className="space-y-3">
              {filteredClients.length > 0 ? (
                filteredClients.map((cliente) => (
                  <motion.div
                    key={cliente.id}
                    layoutId={cliente.id}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 pr-6">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                          {cliente.nome}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                            CPF/CNPJ: {cliente.cpfCnpj}
                          </span>
                        </div>
                      </div>
                      
                      {/* Ações rápidas */}
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {deletingId === cliente.id ? (
                          <div className="flex items-center space-x-1 bg-red-50 border border-red-100 rounded-xl p-1 animate-pulse">
                            <span className="text-[9px] text-red-700 font-bold px-1 uppercase">Excluir?</span>
                            <button
                              onClick={() => {
                                onDeleteClient(cliente.id);
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
                              onClick={() => startEdit(cliente)}
                              className="p-1.5 bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-100 transition"
                              title="Editar cadastro"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeletingId(cliente.id)}
                              className="p-1.5 bg-red-50 text-red-500 hover:text-red-700 rounded-lg border border-red-100 transition"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>{cliente.email}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span className="line-clamp-1">{cliente.endereco}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px] text-slate-400">
                        <div>IE: {cliente.inscricaoEstadual}</div>
                        <div>RG: {cliente.rg}</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2 shadow-sm">
                  <ShieldAlert className="mx-auto text-slate-300" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Nenhum cliente disponível</p>
                  <p className="text-xs text-slate-500">
                    {searchQuery ? 'Tente ajustar sua pesquisa.' : 'Comece cadastrando um cliente acima.'}
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
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Clientes'}
                </h2>
                <p className="text-[11px] text-slate-400">Insira as informações do cliente</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center space-x-1.5 mb-2 animate-pulse">
                  <span>⚠️ {formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome Completo / Razão Social *
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-600">
                        CPF ou CNPJ *
                      </label>
                      {cpfCnpj.replace(/\D/g, '').length === 14 && (
                        <button
                          type="button"
                          onClick={() => buscarCNPJ(cpfCnpj)}
                          disabled={loadingCnpj}
                          className="text-[10px] font-extrabold text-sky-600 hover:text-sky-800 flex items-center space-x-1 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 transition"
                        >
                          {loadingCnpj ? (
                            <RefreshCw size={10} className="animate-spin" />
                          ) : cnpjSearchSuccess ? (
                            <Check size={10} className="text-emerald-600" />
                          ) : (
                            <span>Auto-preencher</span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={cpfCnpj}
                        onChange={(e) => {
                          const formatted = formatCpfCnpj(e.target.value);
                          setCpfCnpj(formatted);
                          const cleaned = formatted.replace(/\D/g, '');
                          if (cleaned.length === 14) {
                            buscarCNPJ(cleaned);
                          }
                        }}
                        required
                        autoCorrect="on"
                        spellCheck={true}
                        placeholder=""
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all pr-10"
                      />
                      {loadingCnpj && (
                        <span className="absolute right-3.5 top-2.5 text-sky-500 animate-spin">
                          <RefreshCw size={14} />
                        </span>
                      )}
                      {cnpjSearchSuccess && (
                        <span className="absolute right-3.5 top-2.5 text-emerald-500">
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                    {cnpjError && (
                      <p className="text-[10px] font-medium text-red-500 mt-1">{cnpjError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      E-mail do Cliente *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Endereço Completo (com CEP) *
                  </label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
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
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      value={inscricaoEstadual}
                      onChange={(e) => setInscricaoEstadual(e.target.value)}
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1"> RG </label>
                    <input
                      type="text"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      autoCorrect="on"
                      spellCheck={true}
                      placeholder=""
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
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
                  {editingClient ? 'Salvar Edições' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
