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

export function gerarOrcamentoPDF(
  orcamento: Orcamento,
  empresa: CompanySettings
): void {
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
      drawPageHeader();
    }
  }

  // Desenha o cabeçalho de página padrão (útil para multi-páginas)
  function drawPageHeader() {
    // Linha decorativa no topo (azul institucional)
    doc.setFillColor(14, 165, 233); // Sky Blue (#0ea5e9)
    doc.rect(marginX, currentY, contentWidth, 1.5, 'F');
    currentY += 4;
  }

  // 1. TOPO & EMITENTE (Cabeçalho principal)
  // Adiciona a primeira linha decorativa
  drawPageHeader();

  const logoHeight = 30;
  const logoWidth = 30;
  const boxX = 145;
  let textStartX = marginX;

  // Verifica se existe logo
  if (empresa.logo && empresa.logo.trim() !== '') {
    try {
      // Adiciona o logo da empresa (base64)
      doc.addImage(empresa.logo, 'JPEG', marginX, currentY, logoWidth, logoHeight);
      textStartX = marginX + logoWidth + 6; // Desloca texto do emitente para a direita
    } catch (e) {
      console.error('Erro ao processar imagem do logo em PDF:', e);
      // Fallback se falhar
      textStartX = marginX;
    }
  }

  // Bloco Emitter à esquerda
  const maxTextWidth = boxX - textStartX - 4;
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  const emitenteNome = empresa.nomeFantasia || 'Sua Empresa / Emitente';
  
  const nameLines = doc.splitTextToSize(emitenteNome, maxTextWidth);
  let nameY = currentY + 4;
  nameLines.forEach((line: string) => {
    doc.text(line, textStartX, nameY);
    nameY += 4.5;
  });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  
  let lineY = nameY + 0.5;
  if (empresa.razaoSocial) {
    const rSocialLines = doc.splitTextToSize(`Razão Social: ${empresa.razaoSocial}`, maxTextWidth);
    rSocialLines.forEach((line: string) => {
      doc.text(line, textStartX, lineY);
      lineY += 4;
    });
  }
  if (empresa.cnpj) {
    const cnpjLines = doc.splitTextToSize(`CNPJ: ${empresa.cnpj}`, maxTextWidth);
    cnpjLines.forEach((line: string) => {
      doc.text(line, textStartX, lineY);
      lineY += 4;
    });
  }
  if (empresa.endereco) {
    const endLines = doc.splitTextToSize(`End: ${empresa.endereco} ${empresa.cep ? `- CEP: ${empresa.cep}` : ''}`, maxTextWidth);
    endLines.forEach((line: string) => {
      doc.text(line, textStartX, lineY);
      lineY += 4;
    });
  }
  
  // E-mail e Tel na mesma linha para economizar espaço se couber
  const telEmailStr = `${empresa.telefone ? `Tel: ${empresa.telefone}` : ''}${empresa.telefone && empresa.email ? ' | ' : ''}${empresa.email ? `E-mail: ${empresa.email}` : ''}`;
  if (telEmailStr) {
    const telEmailLines = doc.splitTextToSize(telEmailStr, maxTextWidth);
    telEmailLines.forEach((line: string) => {
      doc.text(line, textStartX, lineY);
      lineY += 4;
    });
  }

  // Bloco Número Orçamento à direita
  const boxW = 50;
  const boxH = 26;
  doc.setFillColor(241, 245, 249); // Slate 100 background
  doc.rect(boxX, currentY, boxW, boxH, 'F');
  doc.setDrawColor(203, 213, 225); // Slate 200 border
  doc.setLineWidth(0.3);
  doc.rect(boxX, currentY, boxW, boxH, 'D');

  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ORÇAMENTO', boxX + boxW / 2, currentY + 6, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(14, 165, 233); // Sky Blue code number
  doc.text(`Nº ${orcamento.numero}`, boxX + boxW / 2, currentY + 14.5, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Data: ${formatarData(orcamento.dataCriacao)}`, boxX + boxW / 2, currentY + 20, { align: 'center' });

  currentY = Math.max(currentY + logoHeight + 4, lineY + 5);

  // Espaçador / Divisória
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 5;

  // 2. DADOS DO CLIENTE (Bloco de destaque azulado / cinza claro)
  checkSpace(32);
  
  doc.setFillColor(248, 250, 252); // Slate 50 background
  const clientBoxH = 26;
  doc.rect(marginX, currentY, contentWidth, clientBoxH, 'F');
  doc.setDrawColor(226, 232, 240); // Slate 200 border
  doc.rect(marginX, currentY, contentWidth, clientBoxH, 'D');

  // Badge do Cliente
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(marginX + 4, currentY + 3, 20, 4.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CLIENTE', marginX + 14, currentY + 6.3, { align: 'center' });

  // Nome e Documento do cliente
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('Helvetica', 'bold');
  doc.text(orcamento.clienteNome, marginX + 28, currentY + 6.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  
  // Coluna 1 do Cliente (Documento e Email)
  doc.text(`CPF/CNPJ: ${orcamento.clienteDocumento || 'Não informado'}`, marginX + 6, currentY + 13);
  doc.text(`E-mail: ${orcamento.clienteEmail || 'Não informado'}`, marginX + 6, currentY + 18);
  doc.text(`Endereço: ${orcamento.clienteEndereco || 'Não informado'}`, marginX + 6, currentY + 23);

  currentY += clientBoxH + 6;

  // 3. TABELA DE ITENS (Produtos / Serviços)
  checkSpace(25);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('PRODUTOS E SERVIÇOS DETALHADOS', marginX, currentY);
  currentY += 4.5;

  // Cabeçalho da tabela de itens
  const colItemW = 8;
  const colDescrW = 92;
  const colCondW = 20;
  const colQtdW = 15;
  const colVlrUnitW = 22;
  const colVlrTotW = 23;

  const tableHeaderX = marginX;
  doc.setFillColor(30, 41, 59); // Slate 800 (Fundo moderno institucional)
  doc.rect(tableHeaderX, currentY, contentWidth, 7.5, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let currentX = tableHeaderX;
  doc.text('#', currentX + colItemW / 2, currentY + 5, { align: 'center' });
  currentX += colItemW;
  doc.text('Descrição do Produto / Serviço', currentX + 3, currentY + 5);
  currentX += colDescrW;
  doc.text('Condição', currentX + colCondW / 2, currentY + 5, { align: 'center' });
  currentX += colCondW;
  doc.text('Qtd', currentX + colQtdW / 2, currentY + 5, { align: 'center' });
  currentX += colQtdW;
  doc.text('V. Unitário', currentX + colVlrUnitW - 3, currentY + 5, { align: 'right' });
  currentX += colVlrUnitW;
  doc.text('Total', currentX + colVlrTotW - 3, currentY + 5, { align: 'right' });

  currentY += 7.5;
  doc.setFont('Helvetica', 'normal');

  // Desenha cada linha do item
  orcamento.items.forEach((item, index) => {
    // Estimativa de altura: descrição pode ter modelo/marca na segunda linha
    const rowHeight = 9.5;
    checkSpace(rowHeight);

    // Zebra stripes para facilitar leitura
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252); // Slate 50
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
    
    // Borda fina embaixo de cada item
    doc.setDrawColor(241, 245, 249); // Slate 100
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate 800

    let drawX = marginX;
    
    // Numeração do item
    doc.text(String(index + 1), drawX + colItemW / 2, currentY + 5.5, { align: 'center' });
    drawX += colItemW;

    // Nome / Marca / Modelo / NCM
    doc.setFont('Helvetica', 'bold');
    doc.text(item.nome, drawX + 3, currentY + 4);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    const details = `${item.marca ? `Marca: ${item.marca}` : ''}${item.marca && item.modelo ? ' | ' : ''}${item.modelo ? `Modelo: ${item.modelo}` : ''}${item.ncm ? ` | NCM: ${item.ncm}` : ''}`;
    doc.text(details || 'Sem especificações específicas', drawX + 3, currentY + 7.5);
    drawX += colDescrW;

    // Condição
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(item.condicao, drawX + colCondW / 2, currentY + 5.5, { align: 'center' });
    drawX += colCondW;

    // Quantidade
    doc.text(String(item.quantidade), drawX + colQtdW / 2, currentY + 5.5, { align: 'center' });
    drawX += colQtdW;

    // V. Unitário
    doc.text(formatarMoeda(item.precoUnitario), drawX + colVlrUnitW - 3, currentY + 5.5, { align: 'right' });
    drawX += colVlrUnitW;

    // V. Total
    doc.setFont('Helvetica', 'bold');
    doc.text(formatarMoeda(item.quantidade * item.precoUnitario), drawX + colVlrTotW - 3, currentY + 5.5, { align: 'right' });

    currentY += rowHeight;
  });

  // 4. TOTAL (Resumo do valor à direita)
  checkSpace(12);
  const totalBoxW = 60;
  const totalBoxX = pageWidth - marginX - totalBoxW;
  
  doc.setFillColor(241, 245, 249); // Slate 100 background
  doc.rect(totalBoxX, currentY + 2, totalBoxW, 9, 'F');
  doc.setDrawColor(203, 213, 225); // Slate 200 border
  doc.rect(totalBoxX, currentY + 2, totalBoxW, 9, 'D');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('TOTAL DO ORÇAMENTO:', totalBoxX + 3, currentY + 7.8);
  
  doc.setFontSize(10);
  doc.setTextColor(14, 165, 233); // Sky Blue para o preço total
  doc.text(formatarMoeda(orcamento.valorTotal), totalBoxX + totalBoxW - 3, currentY + 7.8, { align: 'right' });

  currentY += 16;

  // 5. CONDIÇÕES, GARANTIA & OBSERVAÇÕES
  const rawObs = orcamento.observacoes || 'Nenhuma observação informada.';
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  const splitObs = doc.splitTextToSize(rawObs, contentWidth - 10); // 10mm padding inside box
  
  // Basic info panel: 14mm height. Spacing: 5mm. Header: 5mm.
  // Observations block height is number of lines * 4 + 10mm padding
  const obsBlockHeight = Math.max(16, (splitObs.length * 4) + 10);
  const totalNeededHeight = 35 + obsBlockHeight;

  checkSpace(totalNeededHeight);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('CONDIÇÕES E TERMOS COMERCIAIS', marginX, currentY);
  currentY += 4;

  // Retângulo cinza claro para as condições gerais
  const condBoxH = 14;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(marginX, currentY, contentWidth, condBoxH, 'F');
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.rect(marginX, currentY, contentWidth, condBoxH, 'D');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // Garantia e Prazo de Execução lado a lado
  doc.setFont('Helvetica', 'bold');
  doc.text('Prazo de Garantia:', marginX + 4, currentY + 5);
  doc.setFont('Helvetica', 'normal');
  doc.text(orcamento.tempoGarantia || 'Não informado', marginX + 33, currentY + 5);

  doc.setFont('Helvetica', 'bold');
  doc.text('Tempo de Execução:', marginX + 90, currentY + 5);
  doc.setFont('Helvetica', 'normal');
  doc.text(orcamento.tempoExecucao || 'Imediato', marginX + 122, currentY + 5);

  // Forma de pagamento
  doc.setFont('Helvetica', 'bold');
  doc.text('Condições de Pagamento:', marginX + 4, currentY + 10);
  doc.setFont('Helvetica', 'normal');
  doc.text(orcamento.condicoesPagamento || 'A combinar', marginX + 41, currentY + 10);

  currentY += condBoxH + 5;

  // Bloco de Diagnóstico / Observações do Equipamento
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('OBSERVAÇÕES DO EQUIPAMENTO / DETALHES DE SERVIÇO', marginX, currentY);
  currentY += 3.5;

  // Amber diagnostic box
  doc.setFillColor(255, 251, 235); // Amber 50
  doc.rect(marginX, currentY, contentWidth, obsBlockHeight, 'F');
  doc.setDrawColor(252, 211, 77); // Amber 200
  doc.rect(marginX, currentY, contentWidth, obsBlockHeight, 'D');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // Brown-Amber 800 for elegant readability

  let obsLineY = currentY + 5.5;
  splitObs.forEach((line: string) => {
    doc.text(line, marginX + 5, obsLineY);
    obsLineY += 4.2;
  });

  currentY += obsBlockHeight + 10;

  // 6. BLOCOS DE ASSINATURA (Sincronizado e centralizado ao rodapé)
  checkSpace(36);

  const signatureW = 70;
  const signatureLineY = currentY + 12;
  
  // Assinatura Prestador (Emitente)
  const providerX = marginX + 10;
  doc.setDrawColor(148, 163, 184); // Slate 400 line
  doc.setLineWidth(0.4);
  doc.line(providerX, signatureLineY, providerX + signatureW, signatureLineY);
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(empresa.nomeFantasia || 'Prestador de Serviços', providerX + signatureW / 2, signatureLineY + 4, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Responsável Técnico', providerX + signatureW / 2, signatureLineY + 7.5, { align: 'center' });

  // Assinatura Cliente
  const clientX = pageWidth - marginX - signatureW - 10;
  doc.line(clientX, signatureLineY, clientX + signatureW, signatureLineY);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(orcamento.clienteNome, clientX + signatureW / 2, signatureLineY + 4, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Aceito e Autorizado em: ___/___/______', clientX + signatureW / 2, signatureLineY + 7.5, { align: 'center' });

  // Rodapé decorativo com link do App
  currentY += 26;
  checkSpace(10);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Este documento é uma proposta comercial de prestação de serviços/venda gerada digitalmente.', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Dispara o download com o nome adaptado
  const nomeArquivo = `Orcamento_${orcamento.numero}_${orcamento.clienteNome.replace(/\s+/g, '_')}.pdf`;
  doc.save(nomeArquivo);
}
