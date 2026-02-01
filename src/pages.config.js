/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Adiantamentos from './pages/Adiantamentos';
import BancoHoras from './pages/BancoHoras';
import Cargos from './pages/Cargos';
import Categorias from './pages/Categorias';
import Clientes from './pages/Clientes';
import CodeFixReview from './pages/CodeFixReview';
import CondicoesPagamento from './pages/CondicoesPagamento';
import Configuracoes from './pages/Configuracoes';
import ContasBancarias from './pages/ContasBancarias';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import Contratacao from './pages/Contratacao';
import CotacoesEPI from './pages/CotacoesEPI';
import DRE from './pages/DRE';
import Dashboard from './pages/Dashboard';
import Departamentos from './pages/Departamentos';
import EPIs from './pages/EPIs';
import EscalasTrabalho from './pages/EscalasTrabalho';
import EspelhoPonto from './pages/EspelhoPonto';
import Estoque from './pages/Estoque';
import FichaCandidato from './pages/FichaCandidato';
import FichaFuncionario from './pages/FichaFuncionario';
import FluxoCaixa from './pages/FluxoCaixa';
import Folha13 from './pages/Folha13';
import FolhaPagamento from './pages/FolhaPagamento';
import FormasPagamento from './pages/FormasPagamento';
import FormularioOS from './pages/FormularioOS';
import FormularioOrcamento from './pages/FormularioOrcamento';
import Fornecedores from './pages/Fornecedores';
import Funcionarios from './pages/Funcionarios';
import GerenciarErros from './pages/GerenciarErros';
import GestaoRH from './pages/GestaoRH';
import GestaoUsuarios from './pages/GestaoUsuarios';
import Home from './pages/Home';
import ImprimirOS from './pages/ImprimirOS';
import MatrizPermissoes from './pages/MatrizPermissoes';
import MeuPerfil from './pages/MeuPerfil';
import MonitoramentoAgente from './pages/MonitoramentoAgente';
import Motores from './pages/Motores';
import MovimentacaoFinanceira from './pages/MovimentacaoFinanceira';
import NotasFiscais from './pages/NotasFiscais';
import OrcamentoCriadoSucesso from './pages/OrcamentoCriadoSucesso';
import Orcamentos from './pages/Orcamentos';
import OrdensServico from './pages/OrdensServico';
import Patrimonio from './pages/Patrimonio';
import PlanoContas from './pages/PlanoContas';
import Ponto from './pages/Ponto';
import Relatorio13Salario from './pages/Relatorio13Salario';
import RelatorioAdiantamentos from './pages/RelatorioAdiantamentos';
import RelatorioContasPagar from './pages/RelatorioContasPagar';
import RelatorioContasReceber from './pages/RelatorioContasReceber';
import RelatorioCotacaoEPI from './pages/RelatorioCotacaoEPI';
import RelatorioEntregasEPI from './pages/RelatorioEntregasEPI';
import RelatorioFluxoCaixa from './pages/RelatorioFluxoCaixa';
import RelatorioFolhaPagamento from './pages/RelatorioFolhaPagamento';
import RelatorioFuncionarios from './pages/RelatorioFuncionarios';
import RelatorioNotasFiscais from './pages/RelatorioNotasFiscais';
import RelatorioOS from './pages/RelatorioOS';
import RelatorioOrcamentos from './pages/RelatorioOrcamentos';
import Servicos from './pages/Servicos';
import Tarefas from './pages/Tarefas';
import TarefasCodeFix from './pages/TarefasCodeFix';
import TermoRecebimentoEPI from './pages/TermoRecebimentoEPI';
import TiposDespesa from './pages/TiposDespesa';
import TiposReceita from './pages/TiposReceita';
import EspelhoPontoPrint from './pages/EspelhoPontoPrint';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Adiantamentos": Adiantamentos,
    "BancoHoras": BancoHoras,
    "Cargos": Cargos,
    "Categorias": Categorias,
    "Clientes": Clientes,
    "CodeFixReview": CodeFixReview,
    "CondicoesPagamento": CondicoesPagamento,
    "Configuracoes": Configuracoes,
    "ContasBancarias": ContasBancarias,
    "ContasPagar": ContasPagar,
    "ContasReceber": ContasReceber,
    "Contratacao": Contratacao,
    "CotacoesEPI": CotacoesEPI,
    "DRE": DRE,
    "Dashboard": Dashboard,
    "Departamentos": Departamentos,
    "EPIs": EPIs,
    "EscalasTrabalho": EscalasTrabalho,
    "EspelhoPonto": EspelhoPonto,
    "Estoque": Estoque,
    "FichaCandidato": FichaCandidato,
    "FichaFuncionario": FichaFuncionario,
    "FluxoCaixa": FluxoCaixa,
    "Folha13": Folha13,
    "FolhaPagamento": FolhaPagamento,
    "FormasPagamento": FormasPagamento,
    "FormularioOS": FormularioOS,
    "FormularioOrcamento": FormularioOrcamento,
    "Fornecedores": Fornecedores,
    "Funcionarios": Funcionarios,
    "GerenciarErros": GerenciarErros,
    "GestaoRH": GestaoRH,
    "GestaoUsuarios": GestaoUsuarios,
    "Home": Home,
    "ImprimirOS": ImprimirOS,
    "MatrizPermissoes": MatrizPermissoes,
    "MeuPerfil": MeuPerfil,
    "MonitoramentoAgente": MonitoramentoAgente,
    "Motores": Motores,
    "MovimentacaoFinanceira": MovimentacaoFinanceira,
    "NotasFiscais": NotasFiscais,
    "OrcamentoCriadoSucesso": OrcamentoCriadoSucesso,
    "Orcamentos": Orcamentos,
    "OrdensServico": OrdensServico,
    "Patrimonio": Patrimonio,
    "PlanoContas": PlanoContas,
    "Ponto": Ponto,
    "Relatorio13Salario": Relatorio13Salario,
    "RelatorioAdiantamentos": RelatorioAdiantamentos,
    "RelatorioContasPagar": RelatorioContasPagar,
    "RelatorioContasReceber": RelatorioContasReceber,
    "RelatorioCotacaoEPI": RelatorioCotacaoEPI,
    "RelatorioEntregasEPI": RelatorioEntregasEPI,
    "RelatorioFluxoCaixa": RelatorioFluxoCaixa,
    "RelatorioFolhaPagamento": RelatorioFolhaPagamento,
    "RelatorioFuncionarios": RelatorioFuncionarios,
    "RelatorioNotasFiscais": RelatorioNotasFiscais,
    "RelatorioOS": RelatorioOS,
    "RelatorioOrcamentos": RelatorioOrcamentos,
    "Servicos": Servicos,
    "Tarefas": Tarefas,
    "TarefasCodeFix": TarefasCodeFix,
    "TermoRecebimentoEPI": TermoRecebimentoEPI,
    "TiposDespesa": TiposDespesa,
    "TiposReceita": TiposReceita,
    "EspelhoPontoPrint": EspelhoPontoPrint,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};