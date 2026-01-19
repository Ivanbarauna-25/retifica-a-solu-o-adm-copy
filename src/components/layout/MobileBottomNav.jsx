import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Users,
  ShoppingCart,
  Banknote,
  Activity,
  Settings,
  X,
  ChevronUp
} from 'lucide-react';

const mobileNavGroups = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, url: 'Dashboard' },
  { key: 'operacional', label: 'Operacional', icon: Wrench, group: 'OPERACIONAL' },
  { key: 'cadastros', label: 'Cadastros', icon: FileText, group: 'CADASTROS' },
  { key: 'rh', label: 'RH', icon: Users, group: 'RECURSOS HUMANOS' },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, group: 'COMPRAS E SUPRIMENTOS' },
  { key: 'financeiro', label: 'Financeiro', icon: Banknote, group: 'FINANCEIRO' },
  { key: 'dev', label: 'Dev', icon: Activity, group: 'DESENVOLVEDOR', requireAdmin: true },
  { key: 'admin', label: 'Admin', icon: Settings, group: 'ADMINISTRAÇÃO' }
];

export default function MobileBottomNav({ navigationGroups, user }) {
  const location = useLocation();
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Filtrar grupos baseado em permissões
  const visibleNavItems = mobileNavGroups.filter((item) => {
    if (item.requireAdmin && user?.role !== 'admin') return false;
    if (item.group) {
      const group = navigationGroups.find((g) => g.group === item.group);
      return group && group.items.length > 0;
    }
    return true;
  });

  // Encontrar grupo ativo baseado na página atual
  const findActiveGroup = () => {
    for (const navItem of mobileNavGroups) {
      if (navItem.url && location.pathname === createPageUrl(navItem.url)) {
        return navItem.key;
      }
      if (navItem.group) {
        const group = navigationGroups.find((g) => g.group === navItem.group);
        if (group?.items.some((item) => location.pathname === createPageUrl(item.url))) {
          return navItem.key;
        }
      }
    }
    return 'dashboard';
  };

  const activeGroup = findActiveGroup();

  const handleNavClick = (item) => {
    if (item.url) {
      setExpandedGroup(null);
    } else if (item.group) {
      setExpandedGroup(expandedGroup === item.key ? null : item.key);
    }
  };

  const getGroupItems = (groupName) => {
    const group = navigationGroups.find((g) => g.group === groupName);
    return group?.items || [];
  };

  return (
    <>
      {/* Overlay para submenu expandido */}
      <AnimatePresence>
        {expandedGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setExpandedGroup(null)}
          />
        )}
      </AnimatePresence>

      {/* Submenu expandido */}
      <AnimatePresence>
        {expandedGroup && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-16 left-0 right-0 bg-gradient-to-b from-slate-800 to-slate-900 z-50 md:hidden rounded-t-3xl shadow-2xl max-h-[65vh] overflow-hidden border-t-2 border-slate-600"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700/50">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  {(() => {
                    const item = mobileNavGroups.find((g) => g.key === expandedGroup);
                    const Icon = item?.icon;
                    return Icon ? <Icon className="w-5 h-5 text-blue-400" /> : null;
                  })()}
                  {mobileNavGroups.find((g) => g.key === expandedGroup)?.label}
                </h3>
                <button
                  onClick={() => setExpandedGroup(null)}
                  className="p-2 rounded-full hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[calc(65vh-80px)] pb-2">
                {getGroupItems(mobileNavGroups.find((g) => g.key === expandedGroup)?.group).map((item, index) => {
                  const isActive = location.pathname === createPageUrl(item.url);
                  return (
                    <Link
                      key={item.url}
                      to={createPageUrl(item.url)}
                      onClick={() => setExpandedGroup(null)}
                      className={`
                        flex items-center gap-2.5 p-3.5 rounded-xl transition-all group
                        ${isActive 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105' 
                          : 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-700 hover:text-white'
                        }
                      `}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className={`
                        p-1.5 rounded-lg transition-all
                        ${isActive ? 'bg-white/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}
                      `}>
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                      </div>
                      <span className="text-xs font-medium truncate leading-tight">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de navegação inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-slate-800 border-t border-slate-700/50 z-50 md:hidden no-print safe-area-bottom shadow-2xl backdrop-blur-lg">
        <div className="flex items-center justify-around px-1 py-1">
          {visibleNavItems.slice(0, 5).map((item) => {
            const isActive = activeGroup === item.key;
            const isExpanded = expandedGroup === item.key;
            const Icon = item.icon;

            return (
              <div key={item.key} className="relative flex-1">
                {item.url ? (
                  <Link
                    to={createPageUrl(item.url)}
                    className="flex flex-col items-center py-1.5 px-1 relative group"
                  >
                    <div className={`
                      p-1.5 rounded-lg transition-all
                      ${isActive 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20' 
                        : 'bg-slate-800/50 group-hover:bg-slate-700 group-active:scale-95'
                      }
                    `}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    </div>
                    <span className={`
                      text-[8px] font-semibold mt-0.5 tracking-tight
                      ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}
                    `}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleNavClick(item)}
                    className="mx-auto px-1 py-1.5 flex flex-col items-center w-full relative group"
                  >
                    <div className={`
                      p-1.5 rounded-lg transition-all relative
                      ${isActive || isExpanded 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20' 
                        : 'bg-slate-800/50 group-hover:bg-slate-700 group-active:scale-95'
                      }
                    `}>
                      <Icon className={`w-5 h-5 ${isActive || isExpanded ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      {isExpanded && (
                        <ChevronUp className="w-3 h-3 absolute -top-1 -right-1 text-blue-400 animate-bounce" />
                      )}
                    </div>
                    <span className={`
                      text-[8px] font-semibold mt-0.5 tracking-tight
                      ${isActive || isExpanded ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}
                    `}>
                      {item.label}
                    </span>
                    {isActive && !isExpanded && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                )}
              </div>
            );
          })}

          {/* Botão "Mais" para os itens restantes */}
          {visibleNavItems.length > 5 && (
            <div className="relative flex-1">
              <button
                onClick={() => setExpandedGroup(expandedGroup === 'more' ? null : 'more')}
                className="mx-auto px-1 py-1.5 flex flex-col items-center w-full group"
              >
                <div className={`
                  p-1.5 rounded-lg transition-all
                  ${expandedGroup === 'more' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20' 
                    : 'bg-slate-800/50 group-hover:bg-slate-700 group-active:scale-95'
                  }
                `}>
                  <Settings className={`w-5 h-5 ${expandedGroup === 'more' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                </div>
                <span className={`
                  text-[8px] font-semibold mt-0.5 tracking-tight
                  ${expandedGroup === 'more' ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}
                `}>
                  Mais
                </span>
              </button>
            </div>
          )}
        </div>
        
        {/* Indicador visual inferior */}
        <div className="h-1 bg-gradient-to-r from-slate-900 via-blue-500/20 to-slate-900"></div>
      </nav>

      {/* Submenu "Mais" */}
      <AnimatePresence>
        {expandedGroup === 'more' && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-16 left-0 right-0 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl shadow-2xl p-4 z-50 border-t-2 border-slate-600"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700/50">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Mais opções
              </h3>
              <button
                onClick={() => setExpandedGroup(null)}
                className="p-2 rounded-full hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {visibleNavItems.slice(5).map((item, index) => {
                const Icon = item.icon;
                const isActive = activeGroup === item.key;

                if (item.url) {
                  return (
                    <Link
                      key={item.key}
                      to={createPageUrl(item.url)}
                      onClick={() => setExpandedGroup(null)}
                      className={`
                        flex flex-col items-center p-3 rounded-xl transition-all
                        ${isActive 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' 
                          : 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-700'
                        }
                      `}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium text-center">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.key}
                    onClick={() => setExpandedGroup(item.key)}
                    className={`
                      flex flex-col items-center p-3 rounded-xl transition-all
                      ${isActive 
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' 
                        : 'text-slate-300 hover:bg-slate-700/70 active:bg-slate-700'
                      }
                    `}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}