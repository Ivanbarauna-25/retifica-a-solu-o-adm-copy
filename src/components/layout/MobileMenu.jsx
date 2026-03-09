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
      {/* Botão hamburguer */}
      <button
        className="md:hidden flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: 44, height: 44,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          background: 'transparent',
          border: 'none',
        }}
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={22} style={{ color: '#8b97b3' }} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }}
          className="md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: 'min(82vw, 290px)',
          background: '#0d1117',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          zIndex: 50,
          transition: 'transform 0.25s ease',
          boxShadow: '4px 0 32px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          minHeight: 60,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(59,127,245,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wrench size={18} style={{ color: '#3b7ff5' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#dde3f0', fontSize: 15 }}>Sistema de Gestão</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}
            aria-label="Fechar menu"
          >
            <X size={20} style={{ color: '#6b7694' }} />
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', WebkitOverflowScrolling: 'touch' }}>
          {navigationGroups.map((group) => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              {group.group === "DASHBOARD" ? (
                <div>
                  {group.items.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <Link
                        key={item.url}
                        to={createPageUrl(item.url)}
                        onClick={() => setIsOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '0 12px',
                          minHeight: 48,
                          borderRadius: 10,
                          textDecoration: 'none',
                          background: active ? 'rgba(59,127,245,0.12)' : 'transparent',
                          boxShadow: active ? 'inset 3px 0 0 #3b7ff5' : 'none',
                          color: active ? '#ffffff' : '#8b97b3',
                          fontWeight: active ? 600 : 500,
                          fontSize: 14,
                          transition: 'all 0.15s',
                        }}
                      >
                        <item.icon size={18} style={{ color: active ? '#3b7ff5' : '#6b7694', flexShrink: 0 }} />
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => toggleGroup(group.group)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 12px', minHeight: 40, border: 'none', background: 'transparent', cursor: 'pointer',
                      color: '#6b7694', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderRadius: 8, touchAction: 'manipulation',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {group.icon && <group.icon size={13} />}
                      {group.group}
                    </div>
                    {openGroups[group.group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {openGroups[group.group] && (
                    <div style={{ paddingLeft: 8 }}>
                      {group.items.map((item) => {
                        const active = isActive(item.url);
                        return (
                          <Link
                            key={item.url}
                            to={createPageUrl(item.url)}
                            onClick={() => setIsOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '0 12px',
                              minHeight: 44,
                              borderRadius: 10,
                              textDecoration: 'none',
                              background: active ? 'rgba(59,127,245,0.12)' : 'transparent',
                              boxShadow: active ? 'inset 3px 0 0 #3b7ff5' : 'none',
                              color: active ? '#ffffff' : '#8b97b3',
                              fontWeight: active ? 600 : 400,
                              fontSize: 13,
                              transition: 'all 0.15s',
                            }}
                          >
                            <item.icon size={16} style={{ color: active ? '#3b7ff5' : '#6b7694', flexShrink: 0 }} />
                            {item.title}
                          </Link>
                        );
                      })}
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