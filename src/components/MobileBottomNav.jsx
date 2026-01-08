import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  Banknote,
  Menu
} from 'lucide-react';

const navItems = [
  { title: 'Início', url: 'Dashboard', icon: LayoutDashboard },
  { title: 'OS', url: 'OrdensServico', icon: ClipboardList },
  { title: 'Clientes', url: 'Clientes', icon: Users },
  { title: 'Estoque', url: 'Estoque', icon: Package },
  { title: 'Financeiro', url: 'FluxoCaixa', icon: Banknote }
];

export default function MobileBottomNav({ onMenuClick }) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === createPageUrl(item.url);
          return (
            <Link
              key={item.url}
              to={createPageUrl(item.url)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors ${
                isActive 
                  ? 'text-slate-800' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-slate-100' : ''
              }`}>
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${
                isActive ? 'text-slate-800' : 'text-slate-500'
              }`}>
                {item.title}
              </span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full py-2 px-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <div className="p-1.5">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium text-slate-500">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}