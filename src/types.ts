export interface CompanySettings {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  cep: string;
  email: string;
  telefone: string;
  logo: string; // Base64 data URL
}

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  endereco: string;
  email: string;
  inscricaoEstadual: string;
  rg: string;
}

export interface Produto {
  id: string;
  nome: string;
  marca: string;
  modelo: string;
  condicao: 'Novo' | 'Seminovo' | 'Usado' | 'Recondicionado';
  ncm: string;
  tipo?: 'Produto' | 'Servico';
}

export interface OrcamentoItem {
  id: string; // unique item id inside budgeting table
  produtoId: string; // references registered product or empty if manual
  nome: string;
  marca: string;
  modelo: string;
  condicao: 'Novo' | 'Seminovo' | 'Usado' | 'Recondicionado';
  ncm: string;
  quantidade: number;
  precoUnitario: number;
  tipo?: 'Produto' | 'Servico';
}

export interface Orcamento {
  id: string;
  numero: string; // sequential code e.g. "1001"
  clienteId: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteEndereco: string;
  clienteEmail: string;
  items: OrcamentoItem[];
  tempoGarantia: string;
  tempoExecucao: string;
  condicoesPagamento: string;
  observacoes: string;
  dataCriacao: string;
  valorTotal: number;
}
