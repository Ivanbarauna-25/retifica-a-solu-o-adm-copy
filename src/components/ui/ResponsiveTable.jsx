import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Componente wrapper para tabelas responsivas
// Em desktop: mostra tabela normal
// Em mobile: mostra como cards empilhados
export function ResponsiveTable({ children, className = '' }) {
  return (
    <div className={`w-full ${className}`}>
      {/* Tabela para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <Table>{children}</Table>
      </div>
      {/* Cards para mobile - renderizado pelo ResponsiveTableBody */}
      <div className="md:hidden">
        {children}
      </div>
    </div>
  );
}

export function ResponsiveTableHeader({ children, className = '' }) {
  return (
    <TableHeader className={`hidden md:table-header-group ${className}`}>
      {children}
    </TableHeader>
  );
}

export function ResponsiveTableBody({ children, mobileRender, data = [], className = '' }) {
  return (
    <>
      {/* Desktop: tabela normal */}
      <TableBody className={`hidden md:table-row-group ${className}`}>
        {children}
      </TableBody>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {mobileRender ? data.map((item, index) => (
          <div key={item.id || index}>
            {mobileRender(item, index)}
          </div>
        )) : null}
      </div>
    </>
  );
}

// Card para exibição mobile de uma linha da tabela
export function MobileCard({ children, className = '', onClick }) {
  return (
    <div 
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-4 ${onClick ? 'cursor-pointer active:bg-slate-50' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Linha de dado no card mobile
export function MobileCardRow({ label, value, className = '', valueClassName = '' }) {
  return (
    <div className={`flex justify-between items-start py-1.5 ${className}`}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-slate-900 text-right ml-2 ${valueClassName}`}>{value}</span>
    </div>
  );
}

// Header do card mobile com título e ações
export function MobileCardHeader({ title, subtitle, badge, actions, className = '' }) {
  return (
    <div className={`flex justify-between items-start mb-3 pb-3 border-b border-slate-100 ${className}`}>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 truncate">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {badge}
        {actions}
      </div>
    </div>
  );
}

// Ações do card mobile
export function MobileCardActions({ children, className = '' }) {
  return (
    <div className={`flex justify-end gap-1 mt-3 pt-3 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export default ResponsiveTable;