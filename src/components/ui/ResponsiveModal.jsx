import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save, Loader2 } from 'lucide-react';

/**
 * Modal responsivo padrão do sistema
 * - Mobile: botões no header, conteúdo com scroll
 * - Desktop: botões no footer, aparência de websistema
 */
export default function ResponsiveModal({
  isOpen,
  onClose,
  onSave,
  title,
  subtitle,
  icon: Icon,
  children,
  isSaving = false,
  saveText = 'Salvar',
  cancelText = 'Cancelar',
  showSaveButton = true,
  showCancelButton = true,
  footerContent = null,
  maxWidth = 'max-w-4xl',
  headerActions = null,
  onPointerDownOutside
}) {
  const handleSave = (e) => {
    e?.preventDefault();
    onSave?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`w-[98vw] md:w-[90vw] ${maxWidth} max-h-[95vh] modern-modal`}
        onPointerDownOutside={onPointerDownOutside || ((e) => e.preventDefault())}
      >
        {/* HEADER */}
        <DialogHeader className="modern-modal-header px-3 md:px-6 py-2 md:py-4">
          <DialogTitle className="flex items-center justify-between text-white gap-2">
            <div className="flex items-center gap-1.5 md:gap-3 min-w-0 flex-1">
              {Icon && (
                <div className="h-7 w-7 md:h-11 md:w-11 rounded-md md:rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xs md:text-base font-semibold text-white truncate">{title}</h2>
                {subtitle && (
                  <p className="text-[9px] md:text-xs text-slate-300 mt-0 hidden sm:block truncate">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Ações customizadas do header */}
            {headerActions && (
              <div className="hidden md:flex items-center gap-1.5">
                {headerActions}
              </div>
            )}

            {/* Botões padrão no header (mobile) */}
            <div className="modern-modal-header-actions">
              {showCancelButton && (
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="bg-transparent border border-white/30 text-white hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
              {showSaveButton && (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-white text-slate-800 hover:bg-slate-100"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* CONTEÚDO ROLÁVEL */}
        <div className="modern-modal-content p-2 md:p-6 bg-slate-50">
          {children}
        </div>

        {/* FOOTER (desktop) */}
        <div className="modern-modal-footer flex flex-col sm:flex-row justify-between items-center gap-2 px-3 md:px-6 py-2.5 md:py-3.5 border-t border-slate-200 bg-white flex-shrink-0">
          {footerContent || (
            <>
              <div className="flex-1" />
              <div className="flex gap-2 w-full sm:w-auto">
                {showCancelButton && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSaving}
                    className="bg-slate-800 text-white hover:bg-slate-700 h-9 text-sm px-4 flex-1 sm:flex-none"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {cancelText}
                  </Button>
                )}
                {showSaveButton && (
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-800 hover:bg-slate-700 text-white h-9 text-sm px-4 flex-1 sm:flex-none"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {saveText}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}