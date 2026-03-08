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
        className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-800 to-slate-900 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header do drawer */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-base">Sistema de Gestão</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Itens de navegação */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {navigationGroups.map((group) => (
            <div key={group.group} className="mb-1">
              {/* DASHBOARD - sem accordion */}
              {group.group === "DASHBOARD" ? (
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.url}
                      to={createPageUrl(item.url)}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive(item.url)
                          ? "bg-slate-600 text-white"
                          : "text-slate-300 hover:bg-slate-700/70 hover:text-white"
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <>
                  {/* Título do grupo (accordion) */}
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 rounded-lg transition-all"
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

                  {/* Itens do grupo */}
                  {openGroups[group.group] && (
                    <div className="mt-1 space-y-1 pl-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.url}
                          to={createPageUrl(item.url)}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isActive(item.url)
                              ? "bg-slate-600 text-white"
                              : "text-slate-300 hover:bg-slate-700/70 hover:text-white"
                          }`}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{item.title}</span>
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