import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, ChevronRight, LogOut, UserCircle } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Landmark,
  ListTodo,
  Users,
  Building2,
  User as UserIcon,
  UserPlus,
  Timer,
  Wallet,
  CalendarCheck,
  Banknote,
  FileText,
  FileBarChart2,
  Wrench,
  Settings,
  BarChart3,
  UserCog,
  CreditCard,
  ArrowRightLeft,
  Tags,
  HardHat,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuSections = [
  {
    title: 'Principal',
    items: [
      { title: 'Dashboard', url: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    title: 'Operacional',
    items: [
      { title: 'Ordens de Serviço', url: 'OrdensServico', icon: ClipboardList },
      { title: 'Orçamentos', url: 'Orcamentos', icon: FileText },
      { title: 'Estoque', url: 'Estoque', icon: Package },
      { title: 'Patrimônio', url: 'Patrimonio', icon: Landmark },
      { title: 'Tarefas', url: 'Tarefas', icon: ListTodo }
    ]
  },
  {
    title: 'Cadastros',
    items: [
      { title: 'Clientes e Veículos', url: 'Clientes', icon: Users },
      { title: 'Fornecedores', url: 'Fornecedores', icon: Building2 },
      { title: 'Serviços', url: 'Servicos', icon: Wrench },
      { title: 'Categorias', url: 'Categorias', icon: Tags },
      { title: 'EPIs', url: 'EPIs', icon: HardHat }
    ]
  },
  {
    title: 'Recursos Humanos',
    items: [
      { title: 'Contratação', url: 'Contratacao', icon: UserPlus },
      { title: 'Equipe', url: 'Funcionarios', icon: UserIcon },
      { title: 'Gestão de RH', url: 'GestaoRH', icon: UserCog },
      { title: 'Controle de Ponto', url: 'Ponto', icon: Timer },
      { title: 'Folha de Pagamento', url: 'FolhaPagamento', icon: Wallet }
    ]
  },
  {
    title: 'Financeiro',
    items: [
      { title: 'Movimentação', url: 'MovimentacaoFinanceira', icon: ArrowRightLeft },
      { title: 'Fluxo de Caixa', url: 'FluxoCaixa', icon: FileBarChart2 },
      { title: 'Contas a Pagar', url: 'ContasPagar', icon: Banknote },
      { title: 'Contas a Receber', url: 'ContasReceber', icon: Banknote },
      { title: 'DRE', url: 'DRE', icon: BarChart3 }
    ]
  },
  {
    title: 'Configurações',
    items: [
      { title: 'Configurações', url: 'Configuracoes', icon: Settings },
      { title: 'Gestão de Usuários', url: 'GestaoUsuarios', icon: UserCog }
    ]
  }
];

export default function MobileMenu({ isOpen, onClose, user, onLogout }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Sistema de Gestão</h2>
              <p className="text-xs text-slate-300">Menu completo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto pb-20">
          {menuSections.map((section) => (
            <div key={section.title} className="py-3">
              <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.url}
                    to={createPageUrl(item.url)}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-slate-500" />
                    <span className="flex-1 text-sm font-medium text-slate-700">
                      {item.title}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}