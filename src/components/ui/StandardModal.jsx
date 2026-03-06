/**
 * StandardModal — Componente padrão para todos os modais/formulários do sistema.
 *
 * Garante:
 * - Largura consistente (sm / md / lg / xl / full)
 * - Header escuro com ícone + título
 * - Conteúdo com scroll interno
 * - Footer com botões padronizados (Cancelar / Salvar)
 * - Suporte a abas (quando `tabs` é passado)
 * - Responsivo mobile / desktop
 */
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Mapeamento de larguras ─────────────────────────────────────────────────
const sizeMap = {
  sm:   'sm:max-w-md',
  md:   'sm:max-w-xl',
  lg:   'sm:max-w-3xl',
  xl:   'sm:max-w-5xl',
  full: 'sm:max-w-[95vw]',
};

// ─── Seção interna (subgrupo de campos) ─────────────────────────────────────
export function ModalSection({ title, children, className }) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 overflow-hidden', className)}>
      {title && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</h4>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Grid de campos ──────────────────────────────────────────────────────────
export function FieldGrid({ cols = 2, children, className }) {
  const colMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };
  return (
    <div className={cn('grid gap-3', colMap[cols] || colMap[2], className)}>
      {children}
    </div>
  );
}

// ─── Campo individual ────────────────────────────────────────────────────────
export function ModalField({ label, required, children, className, colSpan }) {
  const spanMap = { 2: 'sm:col-span-2', 3: 'sm:col-span-3', full: 'col-span-full' };
  return (
    <div className={cn('space-y-1', colSpan && spanMap[colSpan], className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-0.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function StandardModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  children,
  // Footer
  onSave,
  onCancel,
  saveLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  isSaving = false,
  saveDisabled = false,
  footerExtra,
  hideFooter = false,
  // Abas
  tabs,           // Array de { value, label, icon?: Icon, content: ReactNode }
  activeTab,
  onTabChange,
  // Form
  onSubmit,
  className,
}) {
  const hasTabs = tabs && tabs.length > 0;

  const footer = !hideFooter && (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
      <div className="flex-1">{footerExtra}</div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || onClose}
          disabled={isSaving}
          className="h-9 px-4 text-sm border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          {cancelLabel}
        </Button>
        {onSave && (
          <Button
            type={onSubmit ? 'submit' : 'button'}
            onClick={onSubmit ? undefined : onSave}
            disabled={isSaving || saveDisabled}
            className="h-9 px-4 text-sm bg-slate-800 hover:bg-slate-700 text-white gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Salvando...' : saveLabel}
          </Button>
        )}
      </div>
    </div>
  );

  const content = (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-800 rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-white leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-300 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Abas (se existirem) ── */}
      {hasTabs ? (
        <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 flex-shrink-0 bg-white border-b border-slate-200">
            <TabsList className={cn(
              'h-auto bg-slate-100 p-1 rounded-lg gap-0.5',
              tabs.length <= 3 ? 'grid w-full' : 'flex flex-wrap',
              tabs.length === 2 && 'grid-cols-2',
              tabs.length === 3 && 'grid-cols-3',
              tabs.length === 4 && 'grid-cols-4',
              tabs.length === 5 && 'grid-cols-5',
            )}>
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-[11px] md:text-xs font-medium py-1.5 px-2 rounded-md flex items-center gap-1 justify-center data-[state=active]:bg-slate-800 data-[state=active]:text-white"
                >
                  {tab.icon && <tab.icon className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="mt-0 p-5 space-y-4">
                {tab.content}
              </TabsContent>
            ))}
          </div>

          {footer}
        </Tabs>
      ) : (
        <>
          {/* ── Conteúdo simples ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {children}
          </div>
          {footer}
        </>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'p-0 gap-0 flex flex-col overflow-hidden rounded-xl border-0',
          'w-[calc(100vw-1rem)] md:w-auto',
          'max-h-[92vh] md:max-h-[88vh]',
          sizeMap[size] || sizeMap.md,
          className
        )}
        // Esconder o X padrão via CSS no globals
        data-custom-modal="true"
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
            {content}
          </form>
        ) : (
          content
        )}
      </DialogContent>
    </Dialog>
  );
}