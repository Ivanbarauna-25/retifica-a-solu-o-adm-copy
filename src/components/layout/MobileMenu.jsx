import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, Wrench, ChevronDown, ChevronRight } from "lucide-react";

export default function MobileMenu({ navigationGroups }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const location = useLocation();

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const isActive = (url) => location.pathname === createPageUrl(url);

  return (
    <>
      {/* Botão hamburguer - área de toque 44x44 para facilitar toque */}
      <button
        className="md:hidden flex items-center justify-center rounded-lg hover:bg-slate-700/60 active:bg-slate-600 transition-colors"
        style={{ width: 44, height: 44, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6 text-slate-200" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-800 to-slate-900 z-50 transform transition-transform duration-250 ease-in-out md:hidden flex flex-col shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 'min(80vw, 300px)' }}
      >
        {/* Header do drawer */}
        <div className="flex items-center justify-between px-4 border-b border-slate-700/50" style={{ minHeight: 60 }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-base leading-tight">Sistema de Gestão</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-colors flex-shrink-0"
            style={{ width: 44, height: 44, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Itens de navegação */}
        <div className="flex-1 overflow-y-auto py-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {navigationGroups.map((group) => (
            <div key={group.group} className="mb-1">
              {group.group === "DASHBOARD" ? (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.url}
                      to={createPageUrl(item.url)}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 rounded-lg transition-all ${
                        isActive(item.url)
                          ? "bg-slate-600 text-white"
                          : "text-slate-200 hover:bg-slate-700/70 hover:text-white"
                      }`}
                      style={{ minHeight: 48 }}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-semibold text-sm">{item.title}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded-lg transition-all"
                    style={{ minHeight: 44, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="flex items-center gap-2">
                      {group.icon && <group.icon className="w-4 h-4" />}
                      <span>{group.group}</span>
                    </div>
                    {openGroups[group.group] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {openGroups[group.group] && (
                    <div className="mt-0.5 space-y-0.5 pl-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.url}
                          to={createPageUrl(item.url)}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-3 rounded-lg transition-all ${
                            isActive(item.url)
                              ? "bg-slate-600 text-white"
                              : "text-slate-200 hover:bg-slate-700/70 hover:text-white"
                          }`}
                          style={{ minHeight: 46 }}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <span className="text-sm font-medium">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}