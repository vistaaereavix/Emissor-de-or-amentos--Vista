import { CompanySettings, Cliente, Produto, Orcamento } from '../types';

// Um logotipo padrão minimalista desenhado em base64 (um ícone de drone em vetor azul circular)
// para preencher o PDF inicialmente caso o usuário não envie um logotipo personalizado.
// Este base64 representa um SVG estilizado que converte para PNG/JPEG, ou usaremos o canvas gerador automático.
export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  nomeFantasia: 'Vista Aérea Drones',
  razaoSocial: 'Vista Aérea Manutenção e Vendas de Drones Ltda',
  cnpj: '34.890.122/0001-45',
  endereco: 'Av. das Nações Unidas',
  numero: '12901',
  complemento: 'Andar 10',
  cep: '04578-910',
  email: 'diretoria@vistaaereadrones.com.br',
  telefone: '(11) 98765-4321',
  logo: '' // Será gerado dinamicamente via canvas se estiver em branco, garantindo alta resolução!
};

export const INITIAL_CLIENTS: Cliente[] = [
  {
    id: 'c1',
    nome: 'AgroForte Soluções Agrícolas Ltda',
    cpfCnpj: '45.102.394/0001-88',
    endereco: 'Rodovia Marechal Rondon, Km 284 - Fazenda Santa Maria, Botucatu - SP',
    email: 'compras@agroforte.com.br',
    inscricaoEstadual: '123.456.789.110',
    rg: 'Isento'
  },
  {
    id: 'c2',
    nome: 'Ana Clara Souza Silveira',
    cpfCnpj: '321.456.987-00',
    endereco: 'Rua das Palmeiras, 452 - Apto 82 - Vila Mariana, São Paulo - SP',
    email: 'anaclara.foto@gmail.com',
    inscricaoEstadual: 'Não Contribuinte',
    rg: '12.345.678-9'
  }
];

export const INITIAL_PRODUCTS: Produto[] = [
  {
    id: 'p1',
    nome: 'Bateria drone DJI Mavic 3 Enterprise',
    marca: 'DJI',
    modelo: 'Mavic 3 Intelligent Flight Battery',
    condicao: 'Novo',
    ncm: '8507.60.00',
    tipo: 'Produto',
    valorCusto: 950.00,
    valorFinal: 1450.00
  },
  {
    id: 'p2',
    nome: 'Drone DJI Mini 4 Pro Fly More Combo Plus',
    marca: 'DJI',
    modelo: 'RC 2 (Com Tela)',
    condicao: 'Novo',
    ncm: '8806.92.00',
    tipo: 'Produto',
    valorCusto: 5200.00,
    valorFinal: 7800.00
  },
  {
    id: 'p3',
    nome: 'Serviço de Substituição de Braço Motor Traseiro Esquerdo',
    marca: 'Mavic 3 Pro',
    modelo: 'M3P-ARM-B-L',
    condicao: 'Novo',
    ncm: '8807.30.00',
    tipo: 'Servico',
    valorCusto: 120.00,
    valorFinal: 450.00
  },
  {
    id: 'p4',
    nome: 'Módulo GPS de reposição - DJI Phantom 4 Pro v2.0',
    marca: 'DJI Parts',
    modelo: 'P4P-GPS-BOARD',
    condicao: 'Usado',
    ncm: '8526.91.00',
    tipo: 'Produto',
    valorCusto: 300.00,
    valorFinal: 550.00
  },
  {
    id: 'p5',
    nome: 'Remapeamento e Calibração Avançada de IMU & Gimbal',
    marca: 'Vista Aérea Lab',
    modelo: 'CALIB-ADV-01',
    condicao: 'Novo',
    ncm: '9901.12.00',
    tipo: 'Servico',
    valorCusto: 50.00,
    valorFinal: 350.00
  }
];

export const INITIAL_BUDGETS: Orcamento[] = [
  {
    id: 'o1',
    numero: '1001',
    clienteId: 'c1',
    clienteNome: 'AgroForte Soluções Agrícolas Ltda',
    clienteDocumento: '45.102.394/0001-88',
    clienteEndereco: 'Rodovia Marechal Rondon, Km 284 - Fazenda Santa Maria, Botucatu - SP',
    clienteEmail: 'compras@agroforte.com.br',
    items: [
      {
        id: 'i1_1',
        produtoId: 'p1',
        nome: 'Bateria drone DJI Mavic 3 Enterprise',
        marca: 'DJI',
        modelo: 'Mavic 3 Intelligent Flight Battery',
        condicao: 'Novo',
        ncm: '8507.60.00',
        quantidade: 2,
        precoUnitario: 1450.00
      },
      {
        id: 'i1_2',
        produtoId: 'p5',
        nome: 'Remapeamento e Calibração Avançada de IMU & Gimbal',
        marca: 'Vista Aérea Lab',
        modelo: 'CALIB-ADV-01',
        condicao: 'Novo',
        ncm: '9901.12.00',
        quantidade: 1,
        precoUnitario: 350.00
      }
    ],
    tempoGarantia: '90 dias',
    tempoExecucao: '3 dias úteis',
    condicoesPagamento: 'Faturado 15/30 dias no boleto',
    observacoes: 'Aeronave apresentou falha de calibração do compasso após queda suave na plantação. Realizado teste de bancada e verificado baterias estufadas. Recomendável troca imediata.',
    dataCriacao: '2026-06-20T10:00:00-03:00',
    valorTotal: 3250.00
  }
];
