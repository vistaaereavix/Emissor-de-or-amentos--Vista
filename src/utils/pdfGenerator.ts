import { jsPDF } from 'jspdf';
import { CompanySettings, Cliente, Orcamento, OrcamentoItem } from '../types';

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

// Formata valor número para Real R$
function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Formata CNPJ de acordo com a máscara oficial do Brasil XX.XXX.XXX/XXXX-XX
function formatarCNPJ(v: string): string {
  if (!v) return '';
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length !== 14) {
    return v;
  }
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export async function gerarOrcamentoPDF(
  orcamento: Orcamento,
  empresa: CompanySettings
): Promise<void> {
  // Inicializa o jsPDF no formato A4, unidade milímetros (mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Dimensões A4: 210mm x 297mm
  const marginX = 15;
  const pageHeight = 297;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2); // 180mm

  let currentY = 15;

  // Função auxiliar para evitar corte de página e criar nova página se ultrapassar limite
  function checkSpace(neededHeight: number): void {
    if (currentY + neededHeight > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
    }
  }

  // Função auxiliar para desenhar o título de seção com estilo compacto identico ao HTML
  function drawSectionTitle(text: string): void {
    checkSpace(12);
    // Retângulo cinza de fundo
    doc.setFillColor(242, 242, 242);
    doc.rect(marginX, currentY, contentWidth, 6, 'F');
    // Borda escura na esquerda (3px solid #333 correspondente a 1mm)
    doc.setFillColor(51, 51, 51);
    doc.rect(marginX, currentY, 1, 6, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 51, 51);
    doc.text(text.toUpperCase(), marginX + 3.5, currentY + 4.2);
    currentY += 10; // Espaço após o título
  }

  // =========================================================================
  // 1. CABEÇALHO DA EMPRESA (Tabela de 2 colunas sem borda com linha inferior grossa)
  // =========================================================================
  const logoWidth = 40;
  const logoHeight = 30; // 30mm = 3cm de altura exata do logo
  const logoX = marginX;
  const logoY = currentY;
  let hasLogo = false;

  if (empresa.logo && empresa.logo.trim() !== '') {
    try {
      const format = empresa.logo.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(empresa.logo, format, logoX, logoY, logoWidth, logoHeight);
      hasLogo = true;
    } catch (e) {
      console.error('Erro ao processar imagem do logo em PDF:', e);
    }
  }

  // Lado esquerdo: Dados do prestador
  // Se tiver logo, começa em marginX + logoX + logoWidth + 6. Se não, começa em marginX.
  const providerX = hasLogo ? marginX + logoWidth + 6 : marginX;
  const providerWidth = pageWidth - marginX - providerX - 58; // Deixa 58mm para os metadados do orçamento à direita

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate 900
  // Linha 1: Nome Fantasia (Alinhado com o topo do logotipo)
  doc.text(empresa.nomeFantasia || 'Vista Aérea Drone LTDA', providerX, logoY + 4.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600

  // Linha 2: CNPJ (Perfeitamente posicionado)
  const formattedCNPJ = formatarCNPJ(empresa.cnpj || '32216083000147');
  doc.text(`CNPJ: ${formattedCNPJ}`, providerX, logoY + 9.5);

  // Linha 3 & 4: Endereço (com tamanho controlado para caber na altura exata do logo)
  let formattedEndereco = empresa.endereco || '';
  if (empresa.numero) {
    formattedEndereco += `, Nº ${empresa.numero}`;
  }
  if (empresa.complemento) {
    formattedEndereco += ` - ${empresa.complemento}`;
  }
  if (empresa.cep) {
    formattedEndereco += ` - CEP: ${empresa.cep}`;
  }
  const enderecoText = `End: ${formattedEndereco || 'Sereia de Itapuã, Nº 81 - Itapuã - Vila Velha/ES - CEP: 29101-530'}`;
  const splitEndereco = doc.splitTextToSize(enderecoText, providerWidth);
  
  // Limita endereço a duas linhas para manter balanço estrito
  const maxEndLines = splitEndereco.slice(0, 2);
  doc.text(maxEndLines, providerX, logoY + 14.5);

  // Linha 5: Telefone e E-mail (Sancionados ao limite inferior da altura do logo)
  const telMailY = logoY + 14.5 + (maxEndLines.length * 4) + 1.5;
  doc.text(`Tel: ${empresa.telefone || '(27) 98127-7344'}`, providerX, telMailY);
  doc.text(`E-mail: ${empresa.email || 'vistaaereavix@gmail.com'}`, providerX, telMailY + 4);

  // Lado direito: Orçamento # e data (Alinhados com a altura do logo)
  const budgetRightX = pageWidth - marginX;
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  // Orçamento ID no topo direito
  doc.text(`Orçamento #${orcamento.numero}`, budgetRightX, logoY + 4.5, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Emissão: ${formatarData(orcamento.dataCriacao)}`, budgetRightX, logoY + 9.5, { align: 'right' });
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199); // Sky 600
  doc.text(`VALOR TOTAL: ${formatarMoeda(orcamento.valorTotal)}`, budgetRightX, logoY + 15, { align: 'right' });

  // Define currentY logo após a altura total do cabeçalho
  currentY = logoY + logoHeight + 6;

  // Linha inferior grossa do cabeçalho
  doc.setDrawColor(15, 23, 42); // Slate 900
  doc.setLineWidth(0.6);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 6;

  // =========================================================================
  // 2. DADOS DO CLIENTE
  // =========================================================================
  drawSectionTitle('Dados do Cliente');
  checkSpace(18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 51, 51);

  doc.text(`Razão Social: ${orcamento.clienteNome}`, marginX, currentY);
  doc.text(`CPF/CNPJ: ${orcamento.clienteDocumento || 'Não informado'} | E-mail: ${orcamento.clienteEmail || 'Não informado'} | Tel: ${orcamento.clienteTelefone || 'Não informado'}`, marginX, currentY + 4);
  
  const clientAddr = `Endereço: ${orcamento.clienteEndereco || 'Não informado'}`;
  const splitClientAddr = doc.splitTextToSize(clientAddr, contentWidth);
  doc.text(splitClientAddr, marginX, currentY + 8);

  currentY += 8 + (splitClientAddr.length * 4) + 4;

  // =========================================================================
  // 3. PRODUTOS E SERVIÇOS DETALHADOS (Tabela compacta com borda de 1px cinza)
  // =========================================================================
  drawSectionTitle('Produtos e Serviços Detalhados');
  checkSpace(20);

  // Largura das colunas otimizada para evitar transbordamento (tabulação perfeita)
  const colItemW = contentWidth * 0.05; // 9mm
  const colDescrW = contentWidth * 0.48; // 86.4mm
  const colCondW = contentWidth * 0.10; // 18mm
  const colQtdW = contentWidth * 0.07; // 12.6mm
  const colVlrUnitW = contentWidth * 0.15; // 27mm
  const colVlrTotW = contentWidth * 0.15; // 27mm

  // Cabeçalho da tabela (background-color: #f2f2f2, font-weight: bold)
  doc.setFillColor(242, 242, 242);
  doc.rect(marginX, currentY, contentWidth, 7, 'F');
  
  doc.setDrawColor(204, 204, 204); // Célula border 1px solid #ccc
  doc.setLineWidth(0.2);
  doc.rect(marginX, currentY, contentWidth, 7, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 51, 51);

  // Desenha as divisões das colunas do cabeçalho
  let accumX = marginX;
  doc.text('#', accumX + colItemW/2, currentY + 4.8, { align: 'center' });
  doc.line(accumX + colItemW, currentY, accumX + colItemW, currentY + 7);
  
  accumX += colItemW;
  doc.text('Descrição do Produto / Serviço', accumX + 2, currentY + 4.8);
  doc.line(accumX + colDescrW, currentY, accumX + colDescrW, currentY + 7);

  accumX += colDescrW;
  doc.text('Condição', accumX + colCondW/2, currentY + 4.8, { align: 'center' });
  doc.line(accumX + colCondW, currentY, accumX + colCondW, currentY + 7);

  accumX += colCondW;
  doc.text('Qtd', accumX + colQtdW/2, currentY + 4.8, { align: 'center' });
  doc.line(accumX + colQtdW, currentY, accumX + colQtdW, currentY + 7);

  accumX += colQtdW;
  doc.text('V. Unitário', accumX + colVlrUnitW - 2, currentY + 4.8, { align: 'right' });
  doc.line(accumX + colVlrUnitW, currentY, accumX + colVlrUnitW, currentY + 7);

  accumX += colVlrUnitW;
  doc.text('Total', accumX + colVlrTotW - 2, currentY + 4.8, { align: 'right' });

  currentY += 7;

  // Linhas de itens
  orcamento.items.forEach((item, index) => {
    // Evita transbordamento separando e medindo o título do item com splitTextToSize
    const splitNome = doc.splitTextToSize(item.nome, colDescrW - 4);
    
    // Mede as especificações adicionais
    const detailsStr = `${item.marca ? `Marca: ${item.marca}` : ''}${item.marca && item.modelo ? ' | ' : ''}${item.modelo ? `Modelo: ${item.modelo}` : ''}${item.ncm ? ` | NCM: ${item.ncm}` : ''}`;
    const splitDetails = detailsStr ? doc.splitTextToSize(detailsStr, colDescrW - 4) : [];
    
    // Altura ideal calculada dinamicamente baseada em todas as linhas para evitar qualquer estouro ou corte
    const nameLineCount = splitNome.length;
    const detailsLineCount = splitDetails.length;
    
    // Equação estrita de expansão vertical de células para conter o texto por completo sem sobreposições
    const calculatedHeight = 5.5 + (nameLineCount * 4.0) + (detailsLineCount > 0 ? (detailsLineCount * 3.4) + 1.5 : 0);
    const rowHeight = Math.max(10, calculatedHeight);
    
    checkSpace(rowHeight);

    // Borda externa do registro do item
    doc.rect(marginX, currentY, contentWidth, rowHeight, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 51, 51);

    let drawX = marginX;

    // Alinhamento vertical centralizado perfeito dos marcadores e valores numéricos
    const textCenterY = currentY + (rowHeight / 2) + 1.2;

    // Col 1: #
    doc.text(String(index + 1), drawX + colItemW/2, textCenterY, { align: 'center' });
    doc.line(drawX + colItemW, currentY, drawX + colItemW, currentY + rowHeight);
    drawX += colItemW;

    // Col 2: Descrição (desenhada linha por linha com controle de Y rígido)
    doc.setFont('Helvetica', 'bold');
    let descrY = currentY + 4.5;
    splitNome.forEach((line: string) => {
      doc.text(line, drawX + 2, descrY);
      descrY += 4.0;
    });
    
    if (splitDetails.length > 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(102, 102, 102); // Gray 600
      descrY += 0.5; // Margem para as especificações
      splitDetails.forEach((line: string) => {
        doc.text(line, drawX + 2, descrY);
        descrY += 3.4;
      });
    }
    
    doc.setDrawColor(204, 204, 204);
    doc.line(drawX + colDescrW, currentY, drawX + colDescrW, currentY + rowHeight);
    drawX += colDescrW;

    // Col 3: Condição
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 51, 51);
    doc.text(item.condicao, drawX + colCondW/2, textCenterY, { align: 'center' });
    doc.line(drawX + colCondW, currentY, drawX + colCondW, currentY + rowHeight);
    drawX += colCondW;

    // Col 4: Qtd
    doc.text(String(item.quantidade), drawX + colQtdW/2, textCenterY, { align: 'center' });
    doc.line(drawX + colQtdW, currentY, drawX + colQtdW, currentY + rowHeight);
    drawX += colQtdW;

    // Col 5: V. Unitário
    doc.text(formatarMoeda(item.precoUnitario), drawX + colVlrUnitW - 2, textCenterY, { align: 'right' });
    doc.line(drawX + colVlrUnitW, currentY, drawX + colVlrUnitW, currentY + rowHeight);
    drawX += colVlrUnitW;

    // Col 6: Total
    doc.setFont('Helvetica', 'bold');
    doc.text(formatarMoeda(item.quantidade * item.precoUnitario), drawX + colVlrTotW - 2, textCenterY, { align: 'right' });

    currentY += rowHeight;
  });

  // Linhas de TOTAIS (VALOR TOTAL)
  checkSpace(8);
  doc.rect(marginX, currentY, contentWidth, 7, 'S');
  
  // Rótulo VALOR TOTAL
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 51, 51);
  const totalLabelX = marginX + colItemW + colDescrW + colCondW + colQtdW;
  doc.text('VALOR TOTAL:', totalLabelX - 2, currentY + 4.8, { align: 'right' });
  doc.line(totalLabelX, currentY, totalLabelX, currentY + 7);

  // Valor Total
  doc.text(formatarMoeda(orcamento.valorTotal), pageWidth - marginX - 2, currentY + 4.8, { align: 'right' });
  currentY += 12;

  // =========================================================================
  // 4. CONDIÇÕES E TERMOS COMERCIAIS
  // =========================================================================
  drawSectionTitle('Condições e Termos Comerciais');
  checkSpace(16);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 51, 51);

  doc.setFont('Helvetica', 'bold');
  doc.text('Prazo de Garantia:', marginX, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.text(orcamento.tempoGarantia || 'Não informado', marginX + 30, currentY);

  doc.setFont('Helvetica', 'bold');
  doc.text('Condições de Pagamento:', marginX, currentY + 4.5);
  doc.setFont('Helvetica', 'normal');
  
  // Evita estouro de caracteres longos fazendo quebra de linha dinâmica com splitTextToSize
  const condText = orcamento.condicoesPagamento || 'Não informado';
  const splitCond = doc.splitTextToSize(condText, contentWidth - 42);
  doc.text(splitCond, marginX + 42, currentY + 4.5);
  
  const condOffset = (splitCond.length - 1) * 4;

  doc.setFont('Helvetica', 'bold');
  doc.text('Tempo de Execução:', marginX, currentY + 9 + condOffset);
  doc.setFont('Helvetica', 'normal');
  doc.text(orcamento.tempoExecucao || 'Não informado', marginX + 32, currentY + 9 + condOffset);

  currentY += 15 + condOffset;

  // =========================================================================
  // 5. OBSERVAÇÕES
  // =========================================================================
  drawSectionTitle('Observações do Equipamento / Detalhes de Serviço');
  
  const rawObs = orcamento.observacoes || 'Nenhuma observação informada.';
  const splitObs = doc.splitTextToSize(rawObs, contentWidth - 4);
  const obsBoxHeight = Math.max(9, (splitObs.length * 4) + 4);
  
  checkSpace(obsBoxHeight + 5);

  // Caixa de observações estilizada (border: 1px solid #ccc; background-color: #fafafa;)
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(204, 204, 204);
  doc.rect(marginX, currentY, contentWidth, obsBoxHeight, 'F');
  doc.rect(marginX, currentY, contentWidth, obsBoxHeight, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 51, 51);

  let obsTextY = currentY + 4.2;
  splitObs.forEach((line: string) => {
    doc.text(line, marginX + 2, obsTextY);
    obsTextY += 4;
  });

  currentY += obsBoxHeight + 10;

  // =========================================================================
  // 6. ASSINATURAS
  // =========================================================================
  checkSpace(28);

  const sigLineW = 70;
  const sigY = currentY + 16;

  // Esquerda: Vista Aérea Drone LTDA
  const sigLeftX = marginX + 8;
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.3);
  doc.line(sigLeftX, sigY, sigLeftX + sigLineW, sigY);
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 51, 51);
  doc.text('VISTA AÉREA DRONE LTDA', sigLeftX + sigLineW/2, sigY + 4, { align: 'center' });

  // Direita: Cliente
  const sigRightX = pageWidth - marginX - sigLineW - 8;
  doc.line(sigRightX, sigY, sigRightX + sigLineW, sigY);
  doc.text(orcamento.clienteNome.toUpperCase(), sigRightX + sigLineW/2, sigY + 4, { align: 'center' });

  // =========================================================================
  // 7. FOOTER NOTE
  // =========================================================================
  checkSpace(12);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(119, 119, 119); // Muted gray #777
  doc.text('Este documento é uma proposta comercial de prestação de serviços/venda gerada digitalmente.', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Dispara o download com o nome adaptado exatamente: "orçamento de [Nome do Cliente].pdf"
  const nomeArquivo = `orçamento de ${orcamento.clienteNome}.pdf`;
  doc.save(nomeArquivo);
}
