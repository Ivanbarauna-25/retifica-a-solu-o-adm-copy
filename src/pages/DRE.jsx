import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart2, Settings, Calendar, Download, Loader2, ChevronDown, ChevronRight, BarChart3, Save, Trash2, TrendingUp, TrendingDown, PieChart, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function DREPage() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [periodo, setPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  
  const [config, setConfig] = useState({
    nome_configuracao: 'Configuração Padrão',
    regime: 'caixa',
    agrupamento: 'categoria',
    tipo_relatorio: 'sintetico',
    data_referencia: 'vencimento',
    incluir_ordens_servico: true,
    incluir_contas_receber: true,
    incluir_movimentacoes: true,
    incluir_contas_pagar: true,
    incluir_folha_pagamento: true,
    incluir_adiantamentos: true,
    incluir_movimentacoes_despesa: true,
    incluir_compras: true,
    eh_padrao: false
  });
  
  const [configuracoesSalvas, setConfiguracoesSalvas] = useState([]);
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [dreId, setDreId] = useState(null);
  const [dresSalvos, setDresSalvos] = useState([]);
  const [loadingDres, setLoadingDres] = useState(false);
  const [dreAtivo, setDreAtivo] = useState('resumo');
  const [tabAtiva, setTabAtiva] = useState('novo');
  const [dreSelecionado, setDreSelecionado] = useState(null);

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
    carregarDresSalvos();
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const configs = await base44.entities.ConfiguracaoDRE.list();
      setConfiguracoesSalvas(configs);
      
      // Carregar configuração padrão se existir
      const padrao = configs.find(c => c.eh_padrao);
      if (padrao) {
        setConfig({
          nome_configuracao: padrao.nome_configuracao,
          regime: padrao.regime,
          agrupamento: padrao.agrupamento,
          tipo_relatorio: padrao.tipo_relatorio,
          data_referencia: padrao.data_referencia,
          incluir_ordens_servico: padrao.incluir_ordens_servico,
          incluir_contas_receber: padrao.incluir_contas_receber,
          incluir_movimentacoes: padrao.incluir_movimentacoes,
          incluir_contas_pagar: padrao.incluir_contas_pagar,
          incluir_folha_pagamento: padrao.incluir_folha_pagamento,
          incluir_adiantamentos: padrao.incluir_adiantamentos,
          incluir_movimentacoes_despesa: padrao.incluir_movimentacoes_despesa,
          incluir_compras: padrao.incluir_compras,
          eh_padrao: padrao.eh_padrao
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const salvarConfiguracao = async () => {
    try {
      const configData = {
        usuario_id: user.id,
        nome_configuracao: config.nome_configuracao,
        regime: config.regime,
        agrupamento: config.agrupamento,
        tipo_relatorio: config.tipo_relatorio,
        data_referencia: config.data_referencia,
        incluir_ordens_servico: config.incluir_ordens_servico,
        incluir_contas_receber: config.incluir_contas_receber,
        incluir_movimentacoes: config.incluir_movimentacoes,
        incluir_contas_pagar: config.incluir_contas_pagar,
        incluir_folha_pagamento: config.incluir_folha_pagamento,
        incluir_adiantamentos: config.incluir_adiantamentos,
        incluir_movimentacoes_despesa: config.incluir_movimentacoes_despesa,
        incluir_compras: config.incluir_compras,
        eh_padrao: config.eh_padrao
      };

      // Se marcar como padrão, desmarcar outras
      if (config.eh_padrao) {
        const outras = await base44.entities.ConfiguracaoDRE.filter({ eh_padrao: true });
        for (const outra of outras) {
          await base44.entities.ConfiguracaoDRE.update(outra.id, { eh_padrao: false });
        }
      }

      await base44.entities.ConfiguracaoDRE.create(configData);
      
      toast({
        title: "Configuração Salva",
        description: "A configuração foi salva com sucesso"
      });
      
      await carregarConfiguracoes();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração",
        variant: "destructive"
      });
    }
  };

  const carregarConfiguracao = (configId) => {
    const configSalva = configuracoesSalvas.find(c => c.id === configId);
    if (configSalva) {
      setConfig({
        nome_configuracao: configSalva.nome_configuracao,
        regime: configSalva.regime,
        agrupamento: configSalva.agrupamento,
        tipo_relatorio: configSalva.tipo_relatorio,
        data_referencia: configSalva.data_referencia,
        incluir_ordens_servico: configSalva.incluir_ordens_servico,
        incluir_contas_receber: configSalva.incluir_contas_receber,
        incluir_movimentacoes: configSalva.incluir_movimentacoes,
        incluir_contas_pagar: configSalva.incluir_contas_pagar,
        incluir_folha_pagamento: configSalva.incluir_folha_pagamento,
        incluir_adiantamentos: configSalva.incluir_adiantamentos,
        incluir_movimentacoes_despesa: configSalva.incluir_movimentacoes_despesa,
        incluir_compras: configSalva.incluir_compras,
        eh_padrao: configSalva.eh_padrao
      });
    }
  };

  const excluirConfiguracao = async (configId) => {
    if (!window.confirm('Deseja excluir esta configuração?')) return;
    
    try {
      await base44.entities.ConfiguracaoDRE.delete(configId);
      toast({
        title: "Configuração Excluída",
        description: "A configuração foi removida com sucesso"
      });
      await carregarConfiguracoes();
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir configuração",
        variant: "destructive"
      });
    }
  };

  const calcularDRE = async () => {
    setLoading(true);
    try {
      const competencia = `${periodo.ano}-${String(periodo.mes).padStart(2, '0')}`;
      const dataInicio = new Date(periodo.ano, periodo.mes - 1, 1);
      const dataFim = new Date(periodo.ano, periodo.mes, 0);
      
      const categorias = await base44.entities.Categoria.list();
      const planoContas = await base44.entities.PlanoContas.list();
      
      let receitas = [];
      let despesas = [];

      // MOVIMENTAÇÕES FINANCEIRAS (Geral)
      let movimentacoes = [];
      if (config.incluir_movimentacoes || config.incluir_movimentacoes_despesa) {
        movimentacoes = await base44.entities.MovimentacaoFinanceira.list();
      }

      // RECEITAS
      // 1. Movimentações de Entrada (Crédito)
      if (config.incluir_movimentacoes) {
        const movsEntrada = movimentacoes.filter(m => {
          if (m.tipo_movimentacao !== 'credito') return false;
          
          // Evitar duplicação se outras fontes estiverem ativas (opcional, mas recomendável para consistência)
          // Se origem for 'os' e incluir_ordens_servico estiver ativo, ignoramos aqui para pegar lá? 
          // Por enquanto, assumimos que o usuário configura o que quer ver.
          // Mas idealmente: se é Caixa, olhamos Movimentações Baixadas. Se é Competência, olhamos Faturamento.

          let data;
          // Regime de Caixa: considera data_baixa
          if (config.regime === 'caixa') {
             if (m.status !== 'pago' && m.status !== 'recebido' && !m.data_baixa) return false;
             data = m.data_baixa;
          } 
          // Regime de Competência: considera data_competencia ou data_faturamento ou data_vencimento
          else {
             if (config.data_referencia === 'vencimento') data = m.data_vencimento;
             else if (config.data_referencia === 'pagamento') data = m.data_baixa;
             else data = m.data_faturamento || m.data_vencimento;
          }

          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });

        movsEntrada.forEach(m => {
          // Processar rateio de planos de contas
          if (m.planos_contas && m.planos_contas.length > 0) {
            m.planos_contas.forEach(rateio => {
              const conta = planoContas.find(p => p.id === rateio.plano_contas_id);
              const categoria = categorias.find(cat => cat.id === conta?.categoria_id);
              
              receitas.push({
                descricao: m.historico || `Movimentação ${m.numero_documento || ''}`,
                valor: rateio.valor || 0,
                fonte: 'Movimentações Financeiras',
                plano_contas_id: rateio.plano_contas_id,
                categoria_id: conta?.categoria_id,
                categoria_nome: categoria?.nome || 'Receitas Financeiras',
                conta_nome: conta?.nome || 'Movimentação'
              });
            });
          } else {
            // Fallback se não tiver rateio
            receitas.push({
              descricao: m.historico || `Movimentação ${m.numero_documento || ''}`,
              valor: m.valor_total || 0,
              fonte: 'Movimentações Financeiras',
              categoria_id: null,
              categoria_nome: 'Receitas Financeiras',
              conta_nome: 'Movimentação Geral'
            });
          }
        });
      }

      if (config.incluir_contas_receber) {
        const contas = await base44.entities.ContasReceber.list();
        const filtradas = contas.filter(c => {
          if (c.status !== 'recebido') return false;
          let data;
          if (config.data_referencia === 'vencimento') data = c.data_vencimento;
          else if (config.data_referencia === 'pagamento') data = c.data_recebimento;
          else data = c.competencia ? new Date(c.competencia + '-01') : null;
          
          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });
        
        filtradas.forEach(c => {
          const conta = planoContas.find(p => p.id === c.plano_contas_id);
          const categoria = categorias.find(cat => cat.id === conta?.categoria_id);
          receitas.push({
            descricao: c.descricao || 'Conta a Receber',
            valor: c.valor_recebido || c.valor_original || 0,
            fonte: 'Contas a Receber',
            plano_contas_id: c.plano_contas_id,
            categoria_id: conta?.categoria_id,
            categoria_nome: categoria?.nome || 'Sem Categoria',
            conta_nome: conta?.nome || 'Sem Conta'
          });
        });
      }

      if (config.incluir_ordens_servico) {
        const os = await base44.entities.OrdemServico.list();
        const filtradas = os.filter(o => {
          if (o.status !== 'finalizado') return false;
          let data;
          if (config.data_referencia === 'vencimento') data = o.data_abertura;
          else if (config.data_referencia === 'pagamento') data = o.data_conclusao;
          else data = o.data_abertura;
          
          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });
        
        filtradas.forEach(o => {
          const categoriaReceita = categorias.find(c => c.tipo === 'receita' && c.nome.toLowerCase().includes('operacional'));
          receitas.push({
            descricao: `OS ${o.numero_os}`,
            valor: o.valor_total || 0,
            fonte: 'Ordens de Serviço',
            categoria_id: categoriaReceita?.id,
            categoria_nome: categoriaReceita?.nome || 'Receita Operacional',
            conta_nome: 'Venda de Serviços'
          });
        });
      }

      // DESPESAS
      
      // 1. Movimentações de Saída (Débito)
      if (config.incluir_movimentacoes_despesa) {
        const movsSaida = movimentacoes.filter(m => {
          if (m.tipo_movimentacao !== 'debito') return false;
          
          let data;
          if (config.regime === 'caixa') {
             if (m.status !== 'pago' && m.status !== 'baixado' && !m.data_baixa) return false;
             data = m.data_baixa;
          } else {
             if (config.data_referencia === 'vencimento') data = m.data_vencimento;
             else if (config.data_referencia === 'pagamento') data = m.data_baixa;
             else data = m.data_faturamento || m.data_vencimento;
          }

          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });

        movsSaida.forEach(m => {
          if (m.planos_contas && m.planos_contas.length > 0) {
            m.planos_contas.forEach(rateio => {
              const conta = planoContas.find(p => p.id === rateio.plano_contas_id);
              const categoria = categorias.find(cat => cat.id === conta?.categoria_id);
              
              despesas.push({
                descricao: m.historico || `Movimentação ${m.numero_documento || ''}`,
                valor: rateio.valor || 0,
                fonte: 'Movimentações Financeiras',
                plano_contas_id: rateio.plano_contas_id,
                categoria_id: conta?.categoria_id,
                categoria_nome: categoria?.nome || 'Despesas Financeiras',
                conta_nome: conta?.nome || 'Movimentação'
              });
            });
          } else {
            despesas.push({
              descricao: m.historico || `Movimentação ${m.numero_documento || ''}`,
              valor: m.valor_total || 0,
              fonte: 'Movimentações Financeiras',
              categoria_id: null,
              categoria_nome: 'Despesas Financeiras',
              conta_nome: 'Movimentação Geral'
            });
          }
        });
      }

      if (config.incluir_contas_pagar) {
        const contas = await base44.entities.ContasPagar.list();
        const filtradas = contas.filter(c => {
          if (c.status !== 'pago') return false;
          let data;
          if (config.data_referencia === 'vencimento') data = c.data_vencimento;
          else if (config.data_referencia === 'pagamento') data = c.data_pagamento;
          else data = c.competencia ? new Date(c.competencia + '-01') : null;
          
          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });
        
        filtradas.forEach(c => {
          const conta = planoContas.find(p => p.id === c.plano_contas_id);
          const categoria = categorias.find(cat => cat.id === conta?.categoria_id);
          despesas.push({
            descricao: c.descricao || 'Conta a Pagar',
            valor: c.valor_pago || c.valor_original || 0,
            fonte: 'Contas a Pagar',
            plano_contas_id: c.plano_contas_id,
            categoria_id: conta?.categoria_id,
            categoria_nome: categoria?.nome || 'Sem Categoria',
            conta_nome: conta?.nome || 'Sem Conta'
          });
        });
      }

      if (config.incluir_folha_pagamento) {
        const folhas = await base44.entities.FolhaPagamento.list();
        const filtradas = folhas.filter(f => {
          if (f.status_pagamento !== 'pago') return false;
          return f.competencia === competencia;
        });
        
        filtradas.forEach(f => {
          const conta = planoContas.find(p => p.id === f.plano_contas_id);
          const categoria = categorias.find(cat => cat.id === conta?.categoria_id);
          despesas.push({
            descricao: 'Folha de Pagamento',
            valor: f.salario_liquido || 0,
            fonte: 'Folha de Pagamento',
            plano_contas_id: f.plano_contas_id,
            categoria_id: conta?.categoria_id,
            categoria_nome: categoria?.nome || 'Despesa com Pessoal',
            conta_nome: conta?.nome || 'Folha de Pagamento'
          });
        });
      }

      if (config.incluir_adiantamentos) {
        const adiant = await base44.entities.Adiantamento.list();
        const filtrados = adiant.filter(a => {
          if (a.status !== 'pago') return false;
          let data;
          if (config.data_referencia === 'vencimento') data = a.data_adiantamento;
          else if (config.data_referencia === 'pagamento') data = a.data_pagamento;
          else data = a.competencia ? new Date(a.competencia + '-01') : null;
          
          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });
        
        filtrados.forEach(a => {
          const conta = planoContas.find(p => p.id === a.plano_contas_id);
          const categoria = categorias.find(cat => cat.id === conta?.categoria_id);
          despesas.push({
            descricao: 'Adiantamento',
            valor: a.valor || 0,
            fonte: 'Adiantamentos',
            plano_contas_id: a.plano_contas_id,
            categoria_id: conta?.categoria_id,
            categoria_nome: categoria?.nome || 'Despesa com Pessoal',
            conta_nome: conta?.nome || 'Adiantamento'
          });
        });
      }

      if (config.incluir_compras) {
        const compras = await base44.entities.Compra.list();
        const filtradas = compras.filter(c => {
          if (c.tipo !== 'consumo' || c.status !== 'recebido') return false;
          let data;
          if (config.data_referencia === 'vencimento') data = c.data_compra;
          else if (config.data_referencia === 'pagamento') data = c.data_recebimento;
          else data = c.data_compra;
          
          if (!data) return false;
          const dataObj = new Date(data);
          return dataObj >= dataInicio && dataObj <= dataFim;
        });
        
        filtradas.forEach(c => {
          const categoriaDespesa = categorias.find(cat => 
            cat.tipo === 'despesa' && cat.nome.toLowerCase().includes('operacional')
          );
          despesas.push({
            descricao: `Compra - ${c.tipo || 'N/A'}`,
            valor: c.valor_total || 0,
            fonte: 'Compras',
            categoria_id: categoriaDespesa?.id,
            categoria_nome: categoriaDespesa?.nome || 'Despesa Operacional',
            conta_nome: 'Compras'
          });
        });
      }

      const receitasAgrupadas = agruparHierarquico(receitas, categorias, planoContas);
      const despesasAgrupadas = agruparHierarquico(despesas, categorias, planoContas);

      const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);
      const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
      const resultado = totalReceitas - totalDespesas;
      const margemLiquida = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

      setDre({
        receitas: receitasAgrupadas,
        despesas: despesasAgrupadas,
        totalReceitas,
        totalDespesas,
        resultado,
        margemLiquida
      });

      const dreData = {
        competencia,
        regime: config.regime,
        dados_dre: JSON.stringify({
          receitas: receitasAgrupadas,
          despesas: despesasAgrupadas,
          totalReceitas,
          totalDespesas,
          resultado,
          margemLiquida,
          config,
          periodo
        }),
        status: 'em_rascunho'
      };

      const dresExistentes = await base44.entities.DRE.filter({ 
        competencia, 
        regime: config.regime 
      });
      
      if (dresExistentes.length > 0) {
        await base44.entities.DRE.update(dresExistentes[0].id, dreData);
        setDreId(dresExistentes[0].id);
      } else {
        const novoDre = await base44.entities.DRE.create(dreData);
        setDreId(novoDre.id);
      }

      toast({
        title: "DRE Salvo",
        description: "Demonstrativo calculado e salvo com sucesso"
      });

    } catch (error) {
      console.error('Erro ao calcular DRE:', error);
      toast({
        title: "Erro",
        description: "Falha ao calcular DRE",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const agruparHierarquico = (items, categorias, planoContas) => {
    const categoriaMap = {};
    
    items.forEach(item => {
      const catId = item.categoria_id || 'sem_categoria';
      const contaId = item.plano_contas_id || 'sem_conta';
      
      if (!categoriaMap[catId]) {
        categoriaMap[catId] = {
          id: catId,
          nome: item.categoria_nome || 'Sem Categoria',
          contas: {},
          total: 0
        };
      }
      
      if (!categoriaMap[catId].contas[contaId]) {
        categoriaMap[catId].contas[contaId] = {
          id: contaId,
          nome: item.conta_nome || 'Sem Conta',
          items: [],
          total: 0
        };
      }
      
      categoriaMap[catId].contas[contaId].items.push(item);
      categoriaMap[catId].contas[contaId].total += item.valor;
      categoriaMap[catId].total += item.valor;
    });
    
    return Object.values(categoriaMap).map(cat => ({
      ...cat,
      contas: Object.values(cat.contas)
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const exportarPDF = async () => {
    try {
      const mesNome = meses.find(m => m.value === periodo.mes)?.label;
      const titulo = `DRE - ${mesNome}/${periodo.ano} - Regime ${config.regime === 'caixa' ? 'de Caixa' : 'de Competência'}`;
      
      // Preparar dados para PDF
      const dadosExportacao = {
        titulo,
        periodo: `${mesNome}/${periodo.ano}`,
        regime: config.regime === 'caixa' ? 'Caixa' : 'Competência',
        totalReceitas: formatMoeda(dre.totalReceitas),
        totalDespesas: formatMoeda(dre.totalDespesas),
        resultado: formatMoeda(dre.resultado),
        margemLiquida: `${dre.margemLiquida.toFixed(2)}%`,
        receitas: dre.receitas.map(cat => ({
          categoria: cat.nome,
          valor: formatMoeda(cat.total),
          contas: cat.contas.map(conta => ({
            nome: conta.nome,
            valor: formatMoeda(conta.total)
          }))
        })),
        despesas: dre.despesas.map(cat => ({
          categoria: cat.nome,
          valor: formatMoeda(cat.total),
          contas: cat.contas.map(conta => ({
            nome: conta.nome,
            valor: formatMoeda(conta.total)
          }))
        }))
      };

      const response = await base44.functions.invoke('gerarPdfTabela', {
        titulo,
        dados: dadosExportacao
      });

      if (response.data?.url) {
        window.open(response.data.url, '_blank');
        toast({
          title: "PDF Gerado",
          description: "O relatório foi gerado com sucesso"
        });
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF. Função de exportação não disponível.",
        variant: "destructive"
      });
    }
  };

  const carregarDresSalvos = async () => {
    setLoadingDres(true);
    try {
      const dres = await base44.entities.DRE.list('-competencia', 50);
      setDresSalvos(dres);
    } catch (error) {
      console.error('Erro ao carregar DREs:', error);
    } finally {
      setLoadingDres(false);
    }
  };

  const renderDREContent = (dados) => (
    <Tabs value={dreAtivo} onValueChange={setDreAtivo} className="space-y-4">
      <TabsList className="bg-slate-100 p-1">
        <TabsTrigger value="resumo" className="TabsTrigger text-xs">Resumo</TabsTrigger>
        <TabsTrigger value="receitas" className="TabsTrigger text-xs">Receitas</TabsTrigger>
        <TabsTrigger value="despesas" className="TabsTrigger text-xs">Despesas</TabsTrigger>
        <TabsTrigger value="graficos" className="TabsTrigger text-xs">
          <BarChart3 className="w-3 h-3 mr-1" />
          Gráficos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resumo" className="space-y-3 mt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-600 mb-1">Total Receitas</p>
            <p className="text-xl font-bold text-green-600">{formatMoeda(dados.totalReceitas)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-600 mb-1">Total Despesas</p>
            <p className="text-xl font-bold text-red-600">{formatMoeda(dados.totalDespesas)}</p>
          </div>
          
          <div className={`p-4 rounded-lg shadow-sm ${dados.resultado >= 0 ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}>
            <p className="text-xs font-medium text-white/80 mb-1">Resultado</p>
            <p className="text-xl font-bold text-white">{formatMoeda(dados.resultado)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 p-4 rounded-lg border">
            <p className="text-xs font-medium text-slate-600 mb-1">Margem Líquida</p>
            <p className={`text-2xl font-bold ${dados.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dados.margemLiquida.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border">
            <p className="text-xs font-medium text-slate-600 mb-1">Status</p>
            <p className={`text-lg font-bold ${dados.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dados.resultado >= 0 ? '✓ LUCRO' : '✗ PREJUÍZO'}
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border">
            <p className="text-xs font-medium text-slate-600 mb-1">Cobertura</p>
            <p className="text-2xl font-bold text-slate-900">
              {dados.totalDespesas > 0 ? (dados.totalReceitas / dados.totalDespesas).toFixed(2) : '∞'}x
            </p>
          </div>
        </div>

        {/* Recomendação de Saúde Financeira */}
        <Card className={`shadow-sm border-2 ${
          dados.margemLiquida >= 20 ? 'border-green-200 bg-green-50' :
          dados.margemLiquida >= 10 ? 'border-yellow-200 bg-yellow-50' :
          dados.margemLiquida >= 0 ? 'border-orange-200 bg-orange-50' :
          'border-red-200 bg-red-50'
        }`}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                dados.margemLiquida >= 20 ? 'bg-green-600' :
                dados.margemLiquida >= 10 ? 'bg-yellow-600' :
                dados.margemLiquida >= 0 ? 'bg-orange-600' :
                'bg-red-600'
              }`}>
                {dados.margemLiquida >= 20 ? '🎉' :
                 dados.margemLiquida >= 10 ? '👍' :
                 dados.margemLiquida >= 0 ? '⚠️' : '🚨'}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-sm mb-1 ${
                  dados.margemLiquida >= 20 ? 'text-green-900' :
                  dados.margemLiquida >= 10 ? 'text-yellow-900' :
                  dados.margemLiquida >= 0 ? 'text-orange-900' :
                  'text-red-900'
                }`}>
                  {dados.margemLiquida >= 20 ? 'Excelente Saúde Financeira!' :
                   dados.margemLiquida >= 10 ? 'Boa Saúde Financeira' :
                   dados.margemLiquida >= 0 ? 'Atenção: Margem Baixa' :
                   'Alerta: Prejuízo Detectado'}
                </h3>
                <p className={`text-xs ${
                  dados.margemLiquida >= 20 ? 'text-green-800' :
                  dados.margemLiquida >= 10 ? 'text-yellow-800' :
                  dados.margemLiquida >= 0 ? 'text-orange-800' :
                  'text-red-800'
                }`}>
                  {dados.margemLiquida >= 20 ? 
                    'Sua empresa está gerando lucro significativo. Continue monitorando e busque oportunidades de investimento para crescimento.' :
                   dados.margemLiquida >= 10 ?
                    'Margem de lucro saudável. Considere estratégias para otimizar ainda mais os custos operacionais.' :
                   dados.margemLiquida >= 0 ?
                    'Margem de lucro estreita. Revise suas despesas e busque formas de aumentar receitas ou reduzir custos.' :
                    'Sua empresa está operando com prejuízo. É urgente revisar despesas, renegociar contratos e buscar novas fontes de receita.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="bg-green-50 border-b py-2">
              <CardTitle className="text-xs text-green-900">Top 3 Fontes de Receita</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2">
                {dados.receitas
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 3)
                  .map((cat, idx) => {
                    const percentual = dados.totalReceitas > 0 ? (cat.total / dados.totalReceitas) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">{cat.nome}</span>
                          <span className="text-green-600 font-semibold">{formatMoeda(cat.total)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{percentual.toFixed(1)}% do total</p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="bg-red-50 border-b py-2">
              <CardTitle className="text-xs text-red-900">Top 3 Categorias de Despesa</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2">
                {dados.despesas
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 3)
                  .map((cat, idx) => {
                    const percentual = dados.totalDespesas > 0 ? (cat.total / dados.totalDespesas) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">{cat.nome}</span>
                          <span className="text-red-600 font-semibold">{formatMoeda(cat.total)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div 
                            className="bg-red-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{percentual.toFixed(1)}% do total</p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="receitas" className="space-y-3 mt-0">
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-3 rounded-lg shadow-sm">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center text-xs">💰</div>
            RECEITAS {config.tipo_relatorio === 'analitico' ? '(Detalhado)' : '(Resumido)'}
          </h3>
        </div>
        
        {config.tipo_relatorio === 'analitico' ? (
          dados.receitas.map((categoria, catIdx) => (
            <div key={catIdx} className="mb-2">
              <button
                onClick={() => toggleSection(`receita-cat-${catIdx}`)}
                className="flex items-center justify-between w-full p-3 bg-green-50 rounded-lg hover:bg-green-100 border border-green-200 transition-all"
              >
                <div className="flex items-center gap-2">
                  {expandedSections[`receita-cat-${catIdx}`] ? (
                    <ChevronDown className="w-4 h-4 text-green-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-green-700" />
                  )}
                  <span className="font-semibold text-sm text-green-900">{categoria.nome}</span>
                  <span className="text-xs text-green-600">({categoria.contas.length})</span>
                </div>
                <span className="font-semibold text-sm text-green-700">{formatMoeda(categoria.total)}</span>
              </button>
              
              {expandedSections[`receita-cat-${catIdx}`] && (
                <div className="ml-4 mt-1 space-y-1">
                  {categoria.contas.map((conta, contaIdx) => (
                    <div key={contaIdx}>
                      <button
                        onClick={() => toggleSection(`receita-conta-${catIdx}-${contaIdx}`)}
                        className="flex items-center justify-between w-full p-2 bg-slate-50 rounded hover:bg-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {expandedSections[`receita-conta-${catIdx}-${contaIdx}`] ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span className="font-medium text-slate-700">{conta.nome}</span>
                          <span className="text-xs text-slate-500">({conta.items.length})</span>
                        </div>
                        <span className="font-medium text-green-600">{formatMoeda(conta.total)}</span>
                      </button>
                      
                      {expandedSections[`receita-conta-${catIdx}-${contaIdx}`] && (
                        <div className="ml-4 mt-1 space-y-0.5">
                          {conta.items.map((item, i) => (
                            <div key={i} className="flex justify-between py-1 px-2 hover:bg-slate-50 rounded text-xs">
                              <span className="text-slate-600">
                                {item.descricao} <span className="text-xs text-slate-400">({item.fonte})</span>
                              </span>
                              <span className="font-medium">{formatMoeda(item.valor)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {dados.receitas.map((categoria, catIdx) => (
              <div key={catIdx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-green-900">{categoria.nome}</span>
                  <span className="font-semibold text-sm text-green-700">{formatMoeda(categoria.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between p-3 bg-gradient-to-r from-green-100 to-green-50 rounded-lg font-semibold text-green-900 text-sm shadow-sm border border-green-200">
          <span>TOTAL DE RECEITAS</span>
          <span>{formatMoeda(dados.totalReceitas)}</span>
        </div>
      </TabsContent>

      <TabsContent value="despesas" className="space-y-3 mt-0">
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-3 rounded-lg shadow-sm">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center text-xs">💸</div>
            DESPESAS {config.tipo_relatorio === 'analitico' ? '(Detalhado)' : '(Resumido)'}
          </h3>
        </div>
        
        {config.tipo_relatorio === 'analitico' ? (
          dados.despesas.map((categoria, catIdx) => (
            <div key={catIdx} className="mb-2">
              <button
                onClick={() => toggleSection(`despesa-cat-${catIdx}`)}
                className="flex items-center justify-between w-full p-3 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-all"
              >
                <div className="flex items-center gap-2">
                  {expandedSections[`despesa-cat-${catIdx}`] ? (
                    <ChevronDown className="w-4 h-4 text-red-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-red-700" />
                  )}
                  <span className="font-semibold text-sm text-red-900">{categoria.nome}</span>
                  <span className="text-xs text-red-600">({categoria.contas.length})</span>
                </div>
                <span className="font-semibold text-sm text-red-700">{formatMoeda(categoria.total)}</span>
              </button>
              
              {expandedSections[`despesa-cat-${catIdx}`] && (
                <div className="ml-4 mt-1 space-y-1">
                  {categoria.contas.map((conta, contaIdx) => (
                    <div key={contaIdx}>
                      <button
                        onClick={() => toggleSection(`despesa-conta-${catIdx}-${contaIdx}`)}
                        className="flex items-center justify-between w-full p-2 bg-slate-50 rounded hover:bg-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {expandedSections[`despesa-conta-${catIdx}-${contaIdx}`] ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span className="font-medium text-slate-700">{conta.nome}</span>
                          <span className="text-xs text-slate-500">({conta.items.length})</span>
                        </div>
                        <span className="font-medium text-red-600">{formatMoeda(conta.total)}</span>
                      </button>
                      
                      {expandedSections[`despesa-conta-${catIdx}-${contaIdx}`] && (
                        <div className="ml-4 mt-1 space-y-0.5">
                          {conta.items.map((item, i) => (
                            <div key={i} className="flex justify-between py-1 px-2 hover:bg-slate-50 rounded text-xs">
                              <span className="text-slate-600">
                                {item.descricao} <span className="text-xs text-slate-400">({item.fonte})</span>
                              </span>
                              <span className="font-medium">{formatMoeda(item.valor)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {dados.despesas.map((categoria, catIdx) => (
              <div key={catIdx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-red-900">{categoria.nome}</span>
                  <span className="font-semibold text-sm text-red-700">{formatMoeda(categoria.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between p-3 bg-gradient-to-r from-red-100 to-red-50 rounded-lg font-semibold text-red-900 text-sm shadow-sm border border-red-200">
          <span>TOTAL DE DESPESAS</span>
          <span>{formatMoeda(dados.totalDespesas)}</span>
        </div>
      </TabsContent>

      <TabsContent value="graficos" className="space-y-4 mt-0">
        {/* Gráfico de Pizza - Receitas por Categoria */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b py-3">
            <CardTitle className="text-sm text-green-900 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Distribuição de Receitas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {dados.receitas.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={dados.receitas.map(cat => ({
                      name: cat.nome,
                      value: cat.total
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dados.receitas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#059669', '#047857', '#065f46', '#064e3b'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoeda(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">Sem dados de receitas</p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Despesas por Categoria */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b py-3">
            <CardTitle className="text-sm text-red-900 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Distribuição de Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {dados.despesas.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={dados.despesas.map(cat => ({
                      name: cat.nome,
                      value: cat.total
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dados.despesas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoeda(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">Sem dados de despesas</p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras Comparativo */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b py-3">
            <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Comparativo Receitas vs Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={(() => {
                  const categorias = new Set([
                    ...dados.receitas.map(r => r.nome),
                    ...dados.despesas.map(d => d.nome)
                  ]);
                  
                  return Array.from(categorias).map(cat => ({
                    categoria: cat,
                    Receitas: dados.receitas.find(r => r.nome === cat)?.total || 0,
                    Despesas: dados.despesas.find(d => d.nome === cat)?.total || 0
                  }));
                })()}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="categoria" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatMoeda(value)} />
                <Legend />
                <Bar dataKey="Receitas" fill="#10b981" />
                <Bar dataKey="Despesas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Indicadores Visuais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50 border-b py-3">
              <CardTitle className="text-sm text-slate-900">Principais Receitas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {dados.receitas
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5)
                  .map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-slate-700">{cat.nome}</span>
                      </div>
                      <span className="font-semibold text-sm text-green-600">{formatMoeda(cat.total)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50 border-b py-3">
              <CardTitle className="text-sm text-slate-900">Principais Despesas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {dados.despesas
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5)
                  .map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-sm text-slate-700">{cat.nome}</span>
                      </div>
                      <span className="font-semibold text-sm text-red-600">{formatMoeda(cat.total)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
            <FileBarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">DRE Gerencial</h1>
            <p className="text-sm text-slate-600">Demonstrativo de Resultado do Exercício</p>
          </div>
        </div>
      </div>

      <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="novo" className="TabsTrigger text-sm">
            <FileBarChart2 className="w-4 h-4 mr-2" />
            Novo DRE
          </TabsTrigger>
          <TabsTrigger value="salvos" className="TabsTrigger text-sm">
            <Download className="w-4 h-4 mr-2" />
            DREs Salvos
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="TabsTrigger text-sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novo" className="space-y-4">
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <Calendar className="w-4 h-4 text-slate-700" />
                Configurar DRE
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">Mês</Label>
                  <Select
                    value={String(periodo.mes)}
                    onValueChange={(v) => setPeriodo({ ...periodo, mes: parseInt(v) })}
                  >
                    <SelectTrigger className="bg-white h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">Ano</Label>
                  <Input
                    type="number"
                    value={periodo.ano}
                    onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}
                    className="bg-white h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">Regime</Label>
                  <Select
                    value={config.regime}
                    onValueChange={(v) => setConfig({ ...config, regime: v })}
                  >
                    <SelectTrigger className="bg-white h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caixa">Caixa</SelectItem>
                      <SelectItem value="competencia">Competência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">Tipo de Relatório</Label>
                  <Select
                    value={config.tipo_relatorio}
                    onValueChange={(v) => setConfig({ ...config, tipo_relatorio: v })}
                  >
                    <SelectTrigger className="bg-white h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sintetico">Sintético</SelectItem>
                      <SelectItem value="analitico">Analítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700 mb-1 block">Data de Referência</Label>
                  <Select
                    value={config.data_referencia}
                    onValueChange={(v) => setConfig({ ...config, data_referencia: v })}
                  >
                    <SelectTrigger className="bg-white h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vencimento">Vencimento</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                      <SelectItem value="competencia">Competência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={calcularDRE} 
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white h-9 text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Calculando...
                      </>
                    ) : (
                      <>Gerar DRE</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Select
                  value=""
                  onValueChange={carregarConfiguracao}
                >
                  <SelectTrigger className="bg-white h-9 text-sm flex-1">
                    <SelectValue placeholder="Carregar configuração salva..." />
                  </SelectTrigger>
                  <SelectContent>
                    {configuracoesSalvas.map(cfg => (
                      <SelectItem key={cfg.id} value={cfg.id}>
                        {cfg.nome_configuracao} {cfg.eh_padrao && '(Padrão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {dre && (
            <Card className="shadow-sm border border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    DRE - {meses.find(m => m.value === periodo.mes)?.label}/{periodo.ano} - Regime {config.regime === 'caixa' ? 'de Caixa' : 'de Competência'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportarPDF}
                      className="text-white border-white/30 hover:bg-white/10"
                    >
                      <FileDown className="w-3 h-3 mr-1" />
                      Exportar PDF
                    </Button>
                    <div className="text-xs text-white/80">
                      {dreId ? `ID: ${dreId.substring(0, 8)}` : 'Não salvo'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {renderDREContent(dre)}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="salvos" className="space-y-4">
          {!dreSelecionado ? (
            <Card className="shadow-sm border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                <CardTitle className="text-base text-slate-900">DREs Salvos</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingDres ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                  </div>
                ) : dresSalvos.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Nenhum DRE salvo ainda
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dresSalvos.map((dreItem) => {
                      const dados = JSON.parse(dreItem.dados_dre);
                      const competenciaData = new Date(dreItem.competencia + '-01');
                      const mesNome = meses.find(m => m.value === competenciaData.getMonth() + 1)?.label;
                      const ano = competenciaData.getFullYear();
                      
                      return (
                        <div
                          key={dreItem.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setExpandedSections({});
                            setDreAtivo('resumo');
                            setDreSelecionado(dreItem);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                              <FileBarChart2 className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900">
                                DRE {mesNome}/{ano} - {dreItem.regime === 'caixa' ? 'Caixa' : 'Competência'}
                              </p>
                              <p className="text-xs text-slate-500">
                                Resultado: <span className={dados.resultado >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatMoeda(dados.resultado)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(dreItem.created_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDreSelecionado(null);
                    setExpandedSections({});
                  }}
                  className="text-xs"
                >
                  ← Voltar para lista
                </Button>
              </div>
              
              {(() => {
                const dados = JSON.parse(dreSelecionado.dados_dre);
                const competenciaData = new Date(dreSelecionado.competencia + '-01');
                const mesNome = meses.find(m => m.value === competenciaData.getMonth() + 1)?.label;
                const ano = competenciaData.getFullYear();
                
                return (
                  <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-b py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          DRE - {mesNome}/{ano} - Regime {dados.config?.regime === 'caixa' ? 'de Caixa' : 'de Competência'}
                        </CardTitle>
                        <div className="text-xs text-white/80">
                          ID: {dreSelecionado.id.substring(0, 8)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {renderDREContent(dados)}
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-4">
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
              <CardTitle className="text-base text-slate-900">Gerenciar Configurações</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Nome da Configuração</Label>
                <Input
                  value={config.nome_configuracao}
                  onChange={(e) => setConfig({ ...config, nome_configuracao: e.target.value })}
                  className="bg-white"
                  placeholder="Ex: DRE Mensal Padrão"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={config.eh_padrao}
                  onCheckedChange={(v) => setConfig({ ...config, eh_padrao: v })}
                />
                <Label className="text-sm">Definir como configuração padrão</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">Receitas</Label>
                  {[
                    { key: 'incluir_ordens_servico', label: 'Ordens de Serviço' },
                    { key: 'incluir_contas_receber', label: 'Contas a Receber' },
                    { key: 'incluir_movimentacoes', label: 'Movimentações' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={config[item.key]}
                        onCheckedChange={(v) => setConfig({ ...config, [item.key]: v })}
                      />
                      <Label className="text-sm">{item.label}</Label>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">Despesas</Label>
                  {[
                    { key: 'incluir_contas_pagar', label: 'Contas a Pagar' },
                    { key: 'incluir_folha_pagamento', label: 'Folha de Pagamento' },
                    { key: 'incluir_adiantamentos', label: 'Adiantamentos' },
                    { key: 'incluir_movimentacoes_despesa', label: 'Movimentações' },
                    { key: 'incluir_compras', label: 'Compras' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={config[item.key]}
                        onCheckedChange={(v) => setConfig({ ...config, [item.key]: v })}
                      />
                      <Label className="text-sm">{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={salvarConfiguracao}
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                  disabled={!user}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </Button>
              </div>

              {configuracoesSalvas.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-semibold text-slate-900 mb-3 block">Configurações Salvas</Label>
                  <div className="space-y-2">
                    {configuracoesSalvas.map(cfg => (
                      <div key={cfg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm text-slate-900">
                            {cfg.nome_configuracao} {cfg.eh_padrao && <span className="text-xs text-blue-600">(Padrão)</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            Regime: {cfg.regime} • Ref: {cfg.data_referencia} • Tipo: {cfg.tipo_relatorio}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => excluirConfiguracao(cfg.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}