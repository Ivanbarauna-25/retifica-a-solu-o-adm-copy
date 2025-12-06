import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle } from 'lucide-react';

export default function OrcamentoCriadoSucessoPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(createPageUrl('Orcamentos'));
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white border-4 border-blue-500 rounded-3xl p-12 shadow-2xl">
          <div className="flex items-center justify-center gap-6">
            <div className="bg-green-500 rounded-full p-6 shadow-lg">
              <CheckCircle className="w-16 h-16 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-5xl font-bold text-slate-900">
              Orçamento criado<br />com sucesso
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}