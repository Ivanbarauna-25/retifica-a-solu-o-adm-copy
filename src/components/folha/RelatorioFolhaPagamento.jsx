import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate, formatCompetencia } from '@/components/formatters';

export default function RelatorioFolhaPagamento({
  isOpen,
  onClose,
  folhas,
  getFuncionarioNome,
  getDepartamentoNome,
  statusLabels,
  statusColors,
  nomeEmpresa,
  cnpj,
  filtros = {}
}) {

  const handlePrint = () => {
    window.print();
  };

  const totalGeral = folhas.reduce((acc, f) => acc + (f.salario_liquido || 0), 0);
  const totalEntradas = folhas.reduce((acc, f) => acc + (f.total_entradas || 0), 0);
  const totalSaidas = folhas.reduce((acc, f) => acc + (f.total_saidas || 0), 0);

  // Formatar filtros aplicados
  const getFiltrosAplicados = () => {
    const filtrosTexto = [];
    
    if (filtros.competencia) {
      filtrosTexto.push(`Competência: ${formatCompetencia(filtros.competencia)}`);
    }
    
    if (filtros.dataInicio && filtros.dataFim) {
      filtrosTexto.push(`Pagamento: ${formatDate(filtros.dataInicio)} até ${formatDate(filtros.dataFim)}`);
    } else if (filtros.dataInicio) {
      filtrosTexto.push(`Pagamento a partir de: ${formatDate(filtros.dataInicio)}`);
    } else if (filtros.dataFim) {
      filtrosTexto.push(`Pagamento até: ${formatDate(filtros.dataFim)}`);
    }
    
    if (filtros.status && filtros.status !== 'todos') {
      filtrosTexto.push(`Status: ${statusLabels[filtros.status] || filtros.status}`);
    }
    
    if (filtros.funcionarioNome) {
      filtrosTexto.push(`Funcionário: ${filtros.funcionarioNome}`);
    }
    
    if (filtros.departamentoNome) {
      filtrosTexto.push(`Departamento: ${filtros.departamentoNome}`);
    }
    
    if (filtros.apenasComProporcional) {
      filtrosTexto.push(`Situação: Apenas salários proporcionais`);
    }
    
    filtrosTexto.push(`Total de registros: ${folhas.length}`);
    
    return filtrosTexto.join(' | ');
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-content, .printable-content * { visibility: visible; }
          .printable-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: auto; 
            margin: 0; 
            padding: 1cm; 
          }
          @page { 
            size: A4 landscape; 
            margin: 0.5cm; 
          }
          .no-print { display: none !important; }
          
          .print-header { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 15px; 
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .company-info {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 8px;
          }
          
          .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin: 16px 0 12px 0;
            text-align: center;
          }
          
          .filters-info {
            font-size: 10px;
            color: #475569;
            margin-bottom: 16px;
            text-align: center;
            padding: 8px;
            background-color: #f8fafc;
            border-radius: 4px;
          }
          
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            font-size: 9px !important; 
            margin-top: 12px;
          }
          
          th, td { 
            padding: 6px 4px !important; 
            border: 1px solid #e2e8f0 !important; 
            text-align: left !important; 
          }
          
          th { 
            background-color: #1e293b !important; 
            color: white !important;
            font-weight: 600 !important;
            text-transform: uppercase;
            font-size: 8px !important;
            letter-spacing: 0.5px;
          }
          
          td {
            background-color: white !important;
            color: #1e293b !important;
          }
          
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          
          .text-right {
            text-align: right !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .total-row {
            margin-top: 16px;
            padding: 12px;
            background-color: #f1f5f9;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          
          .total-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 600;
          }
          
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
        
        /* Estilos para tela */
        .printable-content {
          padding: 2rem;
        }
        
        .company-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        
        .company-info {
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .report-title {
          font-size: 1.25rem;
          font-weight: bold;
          color: #1e293b;
          margin: 1rem 0 0.75rem 0;
          text-align: center;
        }
        
        .filters-info {
          font-size: 0.75rem;
          color: #475569;
          margin-bottom: 1rem;
          text-align: center;
          padding: 0.5rem;
          background-color: #f8fafc;
          border-radius: 0.375rem;
        }
        
        .total-row {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #f1f5f9;
          border-radius: 0.375rem;
          font-weight: bold;
        }
        
        .total-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          padding: 0.25rem 0;
        }
      `}</style>
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-[95%] h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b flex-row justify-between items-center no-print bg-slate-800">
            <DialogTitle className="text-white">Relatório de Folha de Pagamento</DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} className="bg-white text-slate-800 hover:bg-slate-100">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-700">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto printable-content">
            {/* Cabeçalho do Relatório */}
            <div className="print-header">
              <div className="company-name">{nomeEmpresa || "Nome da Empresa"}</div>
              {cnpj && <div className="company-info">CNPJ: {cnpj}</div>}
              <div className="company-info">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            
            {/* Título do Relatório */}
            <div className="report-title">RELATÓRIO DE FOLHA DE PAGAMENTO</div>
            
            {/* Filtros Aplicados */}
            {getFiltrosAplicados() && (
              <div className="filters-info">
                {getFiltrosAplicados()}
              </div>
            )}
            
            {/* Tabela de Dados */}
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800 hover:bg-slate-800">
                  <TableHead className="text-white font-semibold text-xs">Funcionário</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-center">Competência</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right">Sal. Base</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right">Comissões</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right">H. Extras</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right">Bônus</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right">Outras Entradas</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right text-red-300">Adiantamentos</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right text-red-300">Faltas</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right text-red-300">Encargos</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right text-red-300">Outras Saídas</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-right">Líquido</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-center">Data Pag.</TableHead>
                  <TableHead className="text-white font-semibold text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-slate-500">
                      Nenhuma folha de pagamento encontrada com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  folhas.map((folha) => (
                    <TableRow key={folha.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{getFuncionarioNome(folha.funcionario_id)}</TableCell>
                      <TableCell className="text-center">{formatCompetencia(folha.competencia)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(folha.salario_base || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(folha.comissoes || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(folha.horas_extras || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(folha.bonus || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(folha.outras_entradas || 0)}</TableCell>
                      <TableCell className="text-right text-red-700 font-semibold">{formatCurrency(folha.adiantamentos || 0)}</TableCell>
                      <TableCell className="text-right text-red-700 font-semibold">{formatCurrency(folha.faltas || 0)}</TableCell>
                      <TableCell className="text-right text-red-700 font-semibold">{formatCurrency(folha.encargos || 0)}</TableCell>
                      <TableCell className="text-right text-red-700 font-semibold">{formatCurrency(folha.outras_saidas || 0)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(folha.salario_liquido || 0)}</TableCell>
                      <TableCell className="text-center">{formatDate(folha.data_pagamento)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`status-badge px-2 py-1 text-xs rounded-full ${statusColors[folha.status_pagamento]}`}>
                          {statusLabels[folha.status_pagamento]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Totalizadores */}
            {folhas.length > 0 && (
              <div className="total-row">
                <div className="total-item">
                  <span>Total de Entradas:</span>
                  <span className="text-green-600">{formatCurrency(totalEntradas)}</span>
                </div>
                <div className="total-item">
                  <span>Total de Saídas:</span>
                  <span className="text-red-600">{formatCurrency(totalSaidas)}</span>
                </div>
                <div className="total-item" style={{ borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>Total Líquido:</span>
                  <span className="text-slate-800 text-lg">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}