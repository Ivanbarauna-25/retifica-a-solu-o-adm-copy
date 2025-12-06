import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, FileDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/formatters';

// Função auxiliar para formatar CPF
const formatCPF = (cpf) => {
  if (!cpf) return '-';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
};

export default function RelatorioFuncionariosViewer({
  isOpen,
  onClose,
  funcionarios,
  cargos,
  departamentos,
  nomeEmpresa,
  camposIncluidos
}) {
  // Mapear IDs para nomes
  const getCargo = (cargoId) => {
    if (!cargoId) return '-';
    const cargo = cargos.find((c) => c.id === cargoId);
    return cargo ? cargo.nome : '-';
  };

  const getDepartamento = (departamentoId) => {
    if (!departamentoId) return '-';
    const departamento = departamentos.find((d) => d.id === departamentoId);
    return departamento ? departamento.nome : '-';
  };

  // Calcular resumo
  const resumo = useMemo(() => {
    const total = funcionarios.length;
    const totalSalarios = funcionarios.reduce((acc, f) => acc + (f.salario || 0), 0);
    
    const porCargo = {};
    funcionarios.forEach(f => {
      const cargoNome = getCargo(f.cargo_id);
      porCargo[cargoNome] = (porCargo[cargoNome] || 0) + 1;
    });

    return { total, totalSalarios, porCargo };
  }, [funcionarios, cargos]);

  const handlePrint = () => {
    window.print();
  };

  // Definir quais colunas mostrar baseado em camposIncluidos
  const mostrarColuna = (campo) => {
    if (!camposIncluidos) return true; // Se não foi especificado, mostrar tudo
    return camposIncluidos[campo] === true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body * {
              visibility: hidden;
            }
            .printable-content,
            .printable-content * {
              visibility: visible;
            }
            .printable-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .header-section {
              margin-bottom: 12px;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 10px;
            }

            .report-title {
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.5px;
              text-align: center;
              margin: 12px 0;
              text-transform: uppercase;
            }

            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              font-size: 8px;
              margin-top: 10px;
            }

            th {
              background: #1e293b !important;
              color: white !important;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 7px;
              letter-spacing: 0.5px;
              padding: 6px 4px !important;
              border: none !important;
              text-align: left;
            }

            td {
              padding: 5px 4px !important;
              border-bottom: 1px solid #f1f5f9 !important;
              color: #1e293b;
              font-size: 8px;
            }

            tr:hover td {
              background-color: #f8fafc !important;
            }

            tfoot td {
              background: #1e293b !important;
              color: white !important;
              font-weight: 700;
              text-transform: uppercase;
              border: none !important;
              padding: 8px 4px !important;
            }
          }

          @media screen {
            .header-section {
              margin-bottom: 12px;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 10px;
            }
            
            .company-name {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              letter-spacing: -0.5px;
              margin-bottom: 2px;
            }
            
            .company-details {
              font-size: 11px;
              color: #64748b;
              font-weight: 400;
              line-height: 1.2;
            }

            .report-title {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              text-align: center;
              margin: 12px 0;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }

            th {
              background: #1e293b;
              color: white;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
              padding: 14px 12px;
              text-align: left;
              border-bottom: 2px solid #0f172a;
            }

            td {
              padding: 12px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 13px;
              color: #1e293b;
            }

            tfoot td {
              background: #1e293b;
              color: white;
              font-weight: 700;
              text-transform: uppercase;
              border: none;
              padding: 14px 12px;
            }
          }
        `}</style>

        <DialogHeader className="p-4 border-b no-print">
          <div className="flex items-center justify-between">
            <DialogTitle>Relatório de Funcionários</DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="printable-content p-6 bg-white">
          {/* Cabeçalho */}
          <div className="header-section">
            <div className="company-info">
              <div className="company-name">{nomeEmpresa || "Nome da Empresa"}</div>
              <div className="company-details">
                Gerado em: {new Date().toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })} às {new Date().toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>

          <div className="report-title">Relatório de Funcionários</div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  {mostrarColuna('cpf') && <th>CPF</th>}
                  {mostrarColuna('data_nascimento') && <th>Data Nasc.</th>}
                  {mostrarColuna('email') && <th>Email</th>}
                  {mostrarColuna('telefone') && <th>Telefone</th>}
                  {mostrarColuna('cargo') && <th>Cargo</th>}
                  {mostrarColuna('departamento') && <th>Departamento</th>}
                  {mostrarColuna('data_inicio') && <th>Início</th>}
                  {mostrarColuna('salario') && <th className="text-right">Salário</th>}
                  {mostrarColuna('status') && <th className="text-center">Status</th>}
                  {mostrarColuna('pix') && <th>PIX</th>}
                  {mostrarColuna('cep') && <th>CEP</th>}
                  {mostrarColuna('cidade') && <th>Cidade</th>}
                  {mostrarColuna('uf') && <th className="text-center">UF</th>}
                  {mostrarColuna('contato_emergencia') && <th>Contato Emerg.</th>}
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((func) => (
                  <tr key={func.id}>
                    <td>{func.nome}</td>
                    {mostrarColuna('cpf') && <td>{formatCPF(func.cpf)}</td>}
                    {mostrarColuna('data_nascimento') && <td>{func.data_nascimento ? formatDate(func.data_nascimento) : '-'}</td>}
                    {mostrarColuna('email') && <td>{func.email || '-'}</td>}
                    {mostrarColuna('telefone') && <td>{func.telefone || '-'}</td>}
                    {mostrarColuna('cargo') && <td>{getCargo(func.cargo_id)}</td>}
                    {mostrarColuna('departamento') && <td>{getDepartamento(func.departamento_id)}</td>}
                    {mostrarColuna('data_inicio') && <td>{func.data_inicio ? formatDate(func.data_inicio) : '-'}</td>}
                    {mostrarColuna('salario') && <td className="text-right">{func.salario ? formatCurrency(func.salario) : '-'}</td>}
                    {mostrarColuna('status') && <td className="text-center capitalize">{func.status || '-'}</td>}
                    {mostrarColuna('pix') && <td>{func.pix || '-'}</td>}
                    {mostrarColuna('cep') && <td>{func.cep || '-'}</td>}
                    {mostrarColuna('cidade') && <td>{func.cidade || '-'}</td>}
                    {mostrarColuna('uf') && <td className="text-center">{func.uf || '-'}</td>}
                    {mostrarColuna('contato_emergencia') && <td>{func.contato_emergencia || '-'}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={mostrarColuna('salario') ? 8 : 7} className="text-center font-bold uppercase text-white">TOTAIS</td>
                  {mostrarColuna('salario') && <td className="text-right font-bold text-white">{formatCurrency(resumo.totalSalarios)}</td>}
                  <td colSpan={10}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}