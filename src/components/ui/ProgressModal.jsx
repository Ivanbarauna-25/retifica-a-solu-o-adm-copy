import React, { useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Modal de progresso para operações em lote
 * 
 * @param {boolean} isOpen - Se o modal está aberto
 * @param {string} title - Título da operação
 * @param {number} current - Item atual sendo processado
 * @param {number} total - Total de itens a processar
 * @param {string} status - 'processing' | 'success' | 'error'
 * @param {string} message - Mensagem adicional (opcional)
 * @param {function} onClose - Callback ao fechar (só disponível quando status != 'processing')
 * @param {number} autoCloseDelay - Delay em ms para fechar automaticamente após sucesso (default: 2000)
 */
export default function ProgressModal({
  isOpen,
  title = 'Processando...',
  current = 0,
  total = 0,
  status = 'processing', // 'processing' | 'success' | 'error'
  message = '',
  onClose,
  autoCloseDelay = 2000
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  // Auto-close após sucesso
  useEffect(() => {
    if (status === 'success' && autoCloseDelay > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [status, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-6 py-4 ${
          status === 'success' ? 'bg-green-600' : 
          status === 'error' ? 'bg-red-600' : 
          'bg-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            {status === 'processing' && (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-6 h-6 text-white" />
            )}
            {status === 'error' && (
              <XCircle className="w-6 h-6 text-white" />
            )}
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'processing' && (
            <>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Progresso</span>
                  <span className="font-semibold">{percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-slate-700 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Counter */}
              <div className="text-center">
                <p className="text-slate-700">
                  Processando <span className="font-bold text-slate-900">{current}</span> de <span className="font-bold text-slate-900">{total}</span>
                </p>
                {message && (
                  <p className="text-sm text-slate-500 mt-2">{message}</p>
                )}
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mb-1">Operação Concluída!</p>
              <p className="text-slate-600">
                {message || `${total} item(s) processado(s) com sucesso.`}
              </p>
              <p className="text-xs text-slate-400 mt-3">Fechando automaticamente...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mb-1">Erro na Operação</p>
              <p className="text-slate-600">
                {message || 'Ocorreu um erro durante o processamento.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer - only show close button when not processing */}
        {status !== 'processing' && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <Button 
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold"
            >
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar o estado do modal de progresso
 */
export function useProgressModal() {
  const [state, setState] = React.useState({
    isOpen: false,
    title: 'Processando...',
    current: 0,
    total: 0,
    status: 'processing',
    message: ''
  });

  const start = (title, total) => {
    setState({
      isOpen: true,
      title,
      current: 0,
      total,
      status: 'processing',
      message: ''
    });
  };

  const updateProgress = (current, message = '') => {
    setState(prev => ({
      ...prev,
      current,
      message
    }));
  };

  const success = (message = '') => {
    setState(prev => ({
      ...prev,
      status: 'success',
      message,
      current: prev.total
    }));
  };

  const error = (message = '') => {
    setState(prev => ({
      ...prev,
      status: 'error',
      message
    }));
  };

  const close = () => {
    setState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  return {
    state,
    start,
    updateProgress,
    success,
    error,
    close
  };
}