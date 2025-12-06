import Dashboard from './pages/Dashboard';
import Funcionarios from './pages/Funcionarios';
import OrdensServico from './pages/OrdensServico';
import Estoque from './pages/Estoque';
import Patrimonio from './pages/Patrimonio';
import Clientes from './pages/Clientes';
import Ponto from './pages/Ponto';
import Adiantamentos from './pages/Adiantamentos';
import FolhaPagamento from './pages/FolhaPagamento';
import Contratacao from './pages/Contratacao';
import PlanoContas from './pages/PlanoContas';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import Orcamentos from './pages/Orcamentos';
import Tarefas from './pages/Tarefas';
import Fornecedores from './pages/Fornecedores';
import Configuracoes from './pages/Configuracoes';
import MeuPerfil from './pages/MeuPerfil';
import GestaoUsuarios from './pages/GestaoUsuarios';
import Departamentos from './pages/Departamentos';
import Cargos from './pages/Cargos';
import ContasBancarias from './pages/ContasBancarias';
import FormasPagamento from './pages/FormasPagamento';
import CondicoesPagamento from './pages/CondicoesPagamento';
import FluxoCaixa from './pages/FluxoCaixa';
import Servicos from './pages/Servicos';
import MovimentacaoFinanceira from './pages/MovimentacaoFinanceira';
import RelatorioOrcamentos from './pages/RelatorioOrcamentos';
import RelatorioOS from './pages/RelatorioOS';
import FichaCandidato from './pages/FichaCandidato';
import Categorias from './pages/Categorias';
import CodeFixReview from './pages/CodeFixReview';
import RelatorioAdiantamentos from './pages/RelatorioAdiantamentos';
import FichaFuncionario from './pages/FichaFuncionario';
import GestaoRH from './pages/GestaoRH';
import GerenciarErros from './pages/GerenciarErros';
import TarefasCodeFix from './pages/TarefasCodeFix';
import MonitoramentoAgente from './pages/MonitoramentoAgente';
import MatrizPermissoes from './pages/MatrizPermissoes';
import Motores from './pages/Motores';
import FormularioOS from './pages/FormularioOS';
import FormularioOrcamento from './pages/FormularioOrcamento';
import RelatorioFolhaPagamento from './pages/RelatorioFolhaPagamento';
import OrcamentoCriadoSucesso from './pages/OrcamentoCriadoSucesso';
import NotasFiscais from './pages/NotasFiscais';
import RelatorioNotasFiscais from './pages/RelatorioNotasFiscais';
import TiposDespesa from './pages/TiposDespesa';
import TiposReceita from './pages/TiposReceita';
import ImprimirOS from './pages/ImprimirOS';
import RelatorioContasPagar from './pages/RelatorioContasPagar';
import RelatorioContasReceber from './pages/RelatorioContasReceber';
import DRE from './pages/DRE';
import RelatorioFluxoCaixa from './pages/RelatorioFluxoCaixa';
import Folha13 from './pages/Folha13';
import Relatorio13Salario from './pages/Relatorio13Salario';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Funcionarios": Funcionarios,
    "OrdensServico": OrdensServico,
    "Estoque": Estoque,
    "Patrimonio": Patrimonio,
    "Clientes": Clientes,
    "Ponto": Ponto,
    "Adiantamentos": Adiantamentos,
    "FolhaPagamento": FolhaPagamento,
    "Contratacao": Contratacao,
    "PlanoContas": PlanoContas,
    "ContasPagar": ContasPagar,
    "ContasReceber": ContasReceber,
    "Orcamentos": Orcamentos,
    "Tarefas": Tarefas,
    "Fornecedores": Fornecedores,
    "Configuracoes": Configuracoes,
    "MeuPerfil": MeuPerfil,
    "GestaoUsuarios": GestaoUsuarios,
    "Departamentos": Departamentos,
    "Cargos": Cargos,
    "ContasBancarias": ContasBancarias,
    "FormasPagamento": FormasPagamento,
    "CondicoesPagamento": CondicoesPagamento,
    "FluxoCaixa": FluxoCaixa,
    "Servicos": Servicos,
    "MovimentacaoFinanceira": MovimentacaoFinanceira,
    "RelatorioOrcamentos": RelatorioOrcamentos,
    "RelatorioOS": RelatorioOS,
    "FichaCandidato": FichaCandidato,
    "Categorias": Categorias,
    "CodeFixReview": CodeFixReview,
    "RelatorioAdiantamentos": RelatorioAdiantamentos,
    "FichaFuncionario": FichaFuncionario,
    "GestaoRH": GestaoRH,
    "GerenciarErros": GerenciarErros,
    "TarefasCodeFix": TarefasCodeFix,
    "MonitoramentoAgente": MonitoramentoAgente,
    "MatrizPermissoes": MatrizPermissoes,
    "Motores": Motores,
    "FormularioOS": FormularioOS,
    "FormularioOrcamento": FormularioOrcamento,
    "RelatorioFolhaPagamento": RelatorioFolhaPagamento,
    "OrcamentoCriadoSucesso": OrcamentoCriadoSucesso,
    "NotasFiscais": NotasFiscais,
    "RelatorioNotasFiscais": RelatorioNotasFiscais,
    "TiposDespesa": TiposDespesa,
    "TiposReceita": TiposReceita,
    "ImprimirOS": ImprimirOS,
    "RelatorioContasPagar": RelatorioContasPagar,
    "RelatorioContasReceber": RelatorioContasReceber,
    "DRE": DRE,
    "RelatorioFluxoCaixa": RelatorioFluxoCaixa,
    "Folha13": Folha13,
    "Relatorio13Salario": Relatorio13Salario,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};