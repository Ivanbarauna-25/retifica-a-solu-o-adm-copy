import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Orcamento } from "@/entities/Orcamento";
import { Cliente } from "@/entities/Cliente";
import { Funcionario } from "@/entities/Funcionario";
import { Veiculo } from "@/entities/Veiculo";
import { Configuracoes } from "@/entities/Configuracoes";
import { DespesaOrcamento } from "@/entities/DespesaOrcamento";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/components/formatters";

export default function RelatorioOrcamentosPage() {
  const urlParams = new URLSearchParams(window.location.search);

  const filterStatus = urlParams.get("status") || "";
  const filterNumero = urlParams.get("numeroOrcamento") || "";
  const filterClienteId = urlParams.get("clienteId") || "";
  const filterVendedorId = urlParams.get("vendedorId") || "";
  const filterVeiculoId = urlParams.get("veiculoId") || "";
  const filterCondicaoId = urlParams.get("condicaoId") || "";
  const filterFormaId = urlParams.get("formaId") || "";
  const filterInicio = urlParams.get("dataInicio") || "";
  const filterFim = urlParams.get("dataFim") || "";
  const filterSituacao = urlParams.get("situacao") || "todos";
  const incluirDespesas = urlParams.get("incluirDespesas") === "1";

  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [config, setConfig] = useState(null);
  const [despesasByOrcamento, setDespesasByOrcamento] = useState({});

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      const promises = [
        Orcamento.list("-created_date"),
        Cliente.list(),
        Funcionario.list(),
        Veiculo.list(),
        Configuracoes.list(),
      ];

      if (incluirDespesas) {
        promises.push(DespesaOrcamento.list());
      }

      const results = await Promise.all(promises);

      if (!isMounted) return;

      const [orcData, cliData, funcData, veicData, confData] = results.slice(0, 5);
      const despesasData = incluirDespesas ? results[5] : [];

      setOrcamentos(orcData || []);
      setClientes(cliData || []);
      setFuncionarios(funcData || []);
      setVeiculos(veicData || []);
      setConfig((confData && confData[0]) || null);

      const map = {};
      (despesasData || []).forEach((d) => {
        const key = d.orcamento_id;
        const v = Number(d.valor) || 0;
        map[key] = (map[key] || 0) + v;
      });
      setDespesasByOrcamento(map);

      if (!incluirDespesas) {
        setDespesasByOrcamento({});
      }
    };
    loadAll();

    return () => { isMounted = false; };
  }, [incluirDespesas]);

  const mapCliente = useMemo(() => Object.fromEntries((clientes || []).map((c) => [c.id, c.nome])), [clientes]);
  const mapFuncionario = useMemo(() => Object.fromEntries((funcionarios || []).map((f) => [f.id, f.nome])), [funcionarios]);

  const lista = useMemo(() => {
    return (orcamentos || []).filter((o) => {
      if (!o) return false;

      if (filterStatus && o.status !== filterStatus) return false;
      if (filterNumero && !String(o.numero_orcamento || "").toLowerCase().includes(filterNumero.toLowerCase())) return false;
      if (filterClienteId && String(o.contato_id) !== String(filterClienteId)) return false;
      if (filterVendedorId && String(o.vendedor_id) !== String(filterVendedorId)) return false;
      if (filterVeiculoId && String(o.veiculo_id) !== String(filterVeiculoId)) return false;
      if (filterCondicaoId && String(o.condicao_pagamento_id) !== String(filterCondicaoId)) return false;

      if (filterFormaId) {
        const matchDireto = String(o.forma_pagamento_id) === String(filterFormaId);
        const matchParcela = (o.pagamentos || []).some((p) => String(p.forma_pagamento_id) === String(filterFormaId));
        if (!(matchDireto || matchParcela)) return false;
      }

      if (filterInicio && o.data_orcamento < filterInicio) return false;
      if (filterFim && o.data_orcamento > filterFim) return false;

      if (filterSituacao === "cancelados" && o.status !== "cancelado") return false;
      if (filterSituacao === "nao_cancelados" && o.status === "cancelado") return false;

      return true;
    });
  }, [
    orcamentos,
    filterStatus,
    filterNumero,
    filterClienteId,
    filterVendedorId,
    filterVeiculoId,
    filterCondicaoId,
    filterFormaId,
    filterInicio,
    filterFim,
    filterSituacao
  ]);

  const statusLabels = {
    pendente: "Pendente",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    cancelado: "Cancelado",
    finalizado: "Finalizado",
  };

  const calcularLinha = useCallback((o) => {
    const valorProdutos =
      o.itens?.filter((i) => i.tipo === "produto").reduce((a, it) => a + (Number(it.valor_total ?? Number(it.quantidade || 0) * Number(it.valor_unitario || 0)) || 0), 0) || 0;
    const valorServicos =
      o.itens?.filter((i) => i.tipo === "servico").reduce((a, it) => a + (Number(it.valor_total ?? Number(it.quantidade || 0) * Number(it.valor_unitario || 0)) || 0), 0) || 0;
    const subtotal = valorProdutos + valorServicos;

    const desconto =
      o.desconto_tipo === "percentual" ?
        subtotal * (Number(o.desconto_valor) || 0) / 100 :
        Number(o.desconto_valor) || 0;

    const valorCliente = subtotal - desconto + (Number(o.outras_despesas) || 0);

    const despesasLancadas = despesasByOrcamento[o.id] || 0;
    const despesasTotais = (Number(o.outras_despesas) || 0) + (incluirDespesas ? despesasLancadas : 0);

    const valorEmpresa = valorCliente - despesasTotais;
    const margem = valorCliente > 0 ? valorEmpresa / valorCliente * 100 : 0;

    return { valorProdutos, valorServicos, subtotal, desconto, valorCliente, despesasTotais, valorEmpresa, margem };
  }, [despesasByOrcamento, incluirDespesas]);

  const totalProdutos = useMemo(() => lista.reduce((acc, o) => acc + calcularLinha(o).valorProdutos, 0), [lista, calcularLinha]);
  const totalServicos = useMemo(() => lista.reduce((acc, o) => acc + calcularLinha(o).valorServicos, 0), [lista, calcularLinha]);
  const totalDescontos = useMemo(() => lista.reduce((acc, o) => acc + calcularLinha(o).desconto, 0), [lista, calcularLinha]);
  const totalCliente = useMemo(() => lista.reduce((acc, o) => acc + calcularLinha(o).valorCliente, 0), [lista, calcularLinha]);
  const totalDespesas = useMemo(() => lista.reduce((acc, o) => acc + calcularLinha(o).despesasTotais, 0), [lista, calcularLinha]);
  const totalEmpresa = useMemo(() => lista.reduce((acc, o) => acc + calcularLinha(o).valorEmpresa, 0), [lista, calcularLinha]);

  const margemMedia = useMemo(() => {
    if (totalCliente === 0) return 0;
    return (totalEmpresa / totalCliente) * 100;
  }, [totalEmpresa, totalCliente]);

  return (
    <div translate="no" className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }

        @media print {
          @page { size: A4 landscape; margin: 15mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .report-container { page-break-inside: avoid; }
          .header-section { margin-bottom: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
          .report-title { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
          .filters-line { font-size: 9px; padding: 6px 0; border-top: 1px solid #e2e8f0; margin-top: 8px; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 8px; margin-top: 10px; }
          thead, tfoot { display: table-row-group; }
          th { background: #1e293b !important; color: white !important; font-weight: 600; text-transform: uppercase; font-size: 7px; letter-spacing: 0.5px; padding: 6px 4px !important; border: none !important; }
          td, tfoot td { padding: 5px 4px !important; border-bottom: 1px solid #f1f5f9 !important; color: #1e293b; }
          tfoot td { background: #1e293b !important; color: white !important; font-weight: 700; text-transform: uppercase; border: none !important; padding: 8px 4px !important; }
          tr:hover td { background-color: #f8fafc !important; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 7px; font-weight: 600; border: 1px solid; }
        }

        @media screen {
          .report-container { max-width: 1600px; margin: 0 auto; padding: 40px; background: white; }
          .header-section { margin-bottom: 12px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
          .company-info { display: flex; flex-direction: column; gap: 4px; }
          .company-name { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 2px; }
          .company-details { font-size: 11px; color: #64748b; font-weight: 400; line-height: 1.2; }
          .report-title { font-size: 18px; font-weight: 700; color: #0f172a; text-align: center; margin: 12px 0; letter-spacing: 0.5px; text-transform: uppercase; }
          .filters-line { background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; margin-bottom: 12px; }
          .action-buttons { position: fixed; top: 24px; right: 24px; display: flex; gap: 12px; z-index: 1000; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
          th { background: #1e293b; color: white; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 14px 12px; text-align: left; border-bottom: 2px solid #0f172a; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; }
          tfoot td { background: #1e293b; color: white; font-weight: 700; text-transform: uppercase; border: none; padding: 14px 12px; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background-color: #f8fafc; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid; }
        }
      `}</style>

      <div className="action-buttons no-print">
        <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={() => window.close()} variant="outline" className="border-slate-300 hover:bg-slate-50 shadow-lg">
          <X className="mr-2 h-4 w-4" />
          Fechar
        </Button>
      </div>

      <div className="report-container" translate="no">
        <div className="header-section">
          <div className="company-info">
            <div className="company-name">{config?.nome_empresa || "Relatório de Orçamentos"}</div>
            {config?.cnpj && <div className="company-details">CNPJ: {config.cnpj}</div>}
            <div className="company-details">Gerado em {new Date().toLocaleString("pt-BR")}</div>
          </div>
        </div>

        <div className="report-title">Relatório de Orçamentos</div>

        <div className="filters-line" translate="no">
          <div className="flex gap-4 flex-wrap">
            {filterStatus && <span>Status: {filterStatus}</span>}
            {filterNumero && <span>Nº: {filterNumero}</span>}
            {filterClienteId && <span>Cliente: {urlParams.get("clienteNome") || mapCliente[filterClienteId] || filterClienteId}</span>}
            {filterVendedorId && <span>Vendedor: {urlParams.get("vendedorNome") || mapFuncionario[filterVendedorId] || filterVendedorId}</span>}
            {filterVeiculoId && <span>Veículo: {urlParams.get("veiculoPlaca") || filterVeiculoId}</span>}
            {filterCondicaoId && <span>Condição: {urlParams.get("condicaoNome") || filterCondicaoId}</span>}
            {filterFormaId && <span>Forma: {urlParams.get("formaNome") || filterFormaId}</span>}
            {filterInicio && <span>De: {formatDate(filterInicio)}</span>}
            {filterFim && <span>Até: {formatDate(filterFim)}</span>}
            <span>Incluir Despesas Lançadas: {incluirDespesas ? "Sim" : "Não"}</span>
            {filterSituacao && <span>Situação: {filterSituacao}</span>}
            <span>Total de registros: {lista.length}</span>
          </div>
        </div>

        <table translate="no">
          <thead>
            <tr>
              <th translate="no">Nº</th>
              <th translate="no">Data</th>
              <th translate="no">Cliente</th>
              <th translate="no">Vendedor</th>
              <th className="text-right" translate="no">Produtos</th>
              <th className="text-right" translate="no">Serviços</th>
              <th className="text-right" translate="no">Desconto</th>
              <th className="text-right" translate="no">Total Cliente</th>
              <th className="text-right" translate="no">Despesas</th>
              <th className="text-right" translate="no">Resultado Empresa</th>
              <th className="text-right" translate="no">Margem (%)</th>
              <th translate="no">Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center text-gray-500" translate="no">
                  Nenhum orçamento encontrado com os filtros informados.
                </td>
              </tr>
            ) : (
              lista.map((o) => {
                const r = calcularLinha(o);
                return (
                  <tr key={o.id}>
                    <td translate="no">{o.numero_orcamento}</td>
                    <td translate="no">{formatDate(o.data_orcamento)}</td>
                    <td translate="no">{mapCliente[o.contato_id] || "—"}</td>
                    <td translate="no">{mapFuncionario[o.vendedor_id] || "—"}</td>
                    <td className="text-right" translate="no">{formatCurrency(r.valorProdutos)}</td>
                    <td className="text-right" translate="no">{formatCurrency(r.valorServicos)}</td>
                    <td className="text-right" translate="no">{formatCurrency(r.desconto)}</td>
                    <td className="text-right" translate="no">{formatCurrency(r.valorCliente)}</td>
                    <td className="text-right" translate="no">{formatCurrency(r.despesasTotais)}</td>
                    <td className="text-right" translate="no">{formatCurrency(r.valorEmpresa)}</td>
                    <td className="text-right" translate="no">{r.margem.toFixed(1)}%</td>
                    <td translate="no">{statusLabels[o.status] || o.status || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" className="text-center font-bold uppercase text-white">TOTAIS</td>
              <td className="text-right font-bold text-white">{formatCurrency(totalProdutos)}</td>
              <td className="text-right font-bold text-white">{formatCurrency(totalServicos)}</td>
              <td className="text-right font-bold text-white">{formatCurrency(totalDescontos)}</td>
              <td className="text-right font-bold text-emerald-400">{formatCurrency(totalCliente)}</td>
              <td className="text-right font-bold text-red-400">{formatCurrency(totalDespesas)}</td>
              <td className="text-right font-bold text-blue-400">{formatCurrency(totalEmpresa)}</td>
              <td className="text-right font-bold text-white">{margemMedia.toFixed(1)}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}