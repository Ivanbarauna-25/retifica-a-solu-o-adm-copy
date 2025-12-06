import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, X, Trash2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * StandardDialog - Componente padronizado para diálogos de confirmação, advertência e sucesso
 * 
 * Variantes:
 * - warning: Amarelo - Para advertências antes de ações
 * - danger: Vermelho - Para exclusões e ações destrutivas
 * - success: Verde - Para confirmações de sucesso
 * - info: Azul - Para informações gerais
 * - confirm: Slate - Para confirmações padrão
 * 
 * @param {boolean} isOpen - Controla a visibilidade do diálogo
 * @param {function} onClose - Função chamada ao fechar o diálogo
 * @param {function} onConfirm - Função chamada ao confirmar (opcional)
 * @param {string} title - Título do diálogo
 * @param {string} description - Descrição/mensagem do diálogo
 * @param {string} variant - Variante visual: 'warning', 'danger', 'success', 'info', 'confirm'
 * @param {string} confirmText - Texto do botão de confirmação
 * @param {string} cancelText - Texto do botão de cancelar
 * @param {boolean} showCancel - Mostra ou oculta o botão cancelar (default: true)
 * @param {boolean} isLoading - Estado de carregamento
 * @param {React.ReactNode} children - Conteúdo adicional opcional
 */

const variantConfig = {
  warning: {
    icon: AlertTriangle,
    headerBg: 'bg-yellow-500',
    headerText: 'text-white',
    iconBg: 'bg-yellow-600/30',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    confirmText: 'text-white',
    borderColor: 'border-yellow-500'
  },
  danger: {
    icon: Trash2,
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    iconBg: 'bg-red-700/30',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    confirmText: 'text-white',
    borderColor: 'border-red-500'
  },
  success: {
    icon: CheckCircle2,
    headerBg: 'bg-green-600',
    headerText: 'text-white',
    iconBg: 'bg-green-700/30',
    confirmBg: 'bg-green-600 hover:bg-green-700',
    confirmText: 'text-white',
    borderColor: 'border-green-500'
  },
  info: {
    icon: Info,
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    iconBg: 'bg-blue-700/30',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    confirmText: 'text-white',
    borderColor: 'border-blue-500'
  },
  confirm: {
    icon: AlertCircle,
    headerBg: 'bg-slate-800',
    headerText: 'text-white',
    iconBg: 'bg-slate-700/50',
    confirmBg: 'bg-slate-800 hover:bg-slate-700',
    confirmText: 'text-white',
    borderColor: 'border-slate-700'
  }
};

export default function StandardDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'confirm',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  showCancel = true,
  isLoading = false,
  children
}) {
  const config = variantConfig[variant] || variantConfig.confirm;
  const Icon = config.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`bg-white border-2 ${config.borderColor} shadow-2xl p-0 max-w-md`}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className={`px-6 py-4 ${config.headerBg} ${config.headerText} rounded-t-lg`}>
          <DialogTitle className="flex items-center gap-3 text-lg font-bold">
            <div className={`${config.iconBg} p-2 rounded-lg`}>
              <Icon className="w-5 h-5" />
            </div>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className={`${config.headerText} opacity-90 mt-2 text-sm`}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Conteúdo adicional */}
        {children && (
          <div className="px-6 py-4">
            {children}
          </div>
        )}

        {/* Footer com botões */}
        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg gap-3">
          {showCancel && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold px-5"
            >
              <X className="w-4 h-4 mr-2" />
              {cancelText}
            </Button>
          )}
          {onConfirm && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`${config.confirmBg} ${config.confirmText} font-semibold px-5`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Icon className="w-4 h-4 mr-2" />
                  {confirmText}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para gerenciar estados de diálogos padrão
 * 
 * @returns {Object} - Objeto com estados e funções para gerenciar diálogos
 */
export function useStandardDialog() {
  const [dialogState, setDialogState] = React.useState({
    isOpen: false,
    title: '',
    description: '',
    variant: 'confirm',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    showCancel: true,
    onConfirm: null,
    children: null
  });

  const showDialog = ({
    title,
    description,
    variant = 'confirm',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    showCancel = true,
    onConfirm,
    children = null
  }) => {
    setDialogState({
      isOpen: true,
      title,
      description,
      variant,
      confirmText,
      cancelText,
      showCancel,
      onConfirm,
      children
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  // Métodos de conveniência
  const showWarning = (title, description, onConfirm) => {
    showDialog({
      title,
      description,
      variant: 'warning',
      confirmText: 'Entendi',
      onConfirm
    });
  };

  const showDanger = (title, description, onConfirm) => {
    showDialog({
      title,
      description,
      variant: 'danger',
      confirmText: 'Excluir',
      onConfirm
    });
  };

  const showSuccess = (title, description) => {
    showDialog({
      title,
      description,
      variant: 'success',
      confirmText: 'OK',
      showCancel: false,
      onConfirm: () => closeDialog()
    });
  };

  const showInfo = (title, description) => {
    showDialog({
      title,
      description,
      variant: 'info',
      confirmText: 'OK',
      showCancel: false,
      onConfirm: () => closeDialog()
    });
  };

  const showConfirm = (title, description, onConfirm) => {
    showDialog({
      title,
      description,
      variant: 'confirm',
      onConfirm
    });
  };

  return {
    dialogState,
    showDialog,
    closeDialog,
    showWarning,
    showDanger,
    showSuccess,
    showInfo,
    showConfirm,
    // Renderizador do diálogo
    DialogComponent: () => (
      <StandardDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        description={dialogState.description}
        variant={dialogState.variant}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        showCancel={dialogState.showCancel}
      >
        {dialogState.children}
      </StandardDialog>
    )
  };
}