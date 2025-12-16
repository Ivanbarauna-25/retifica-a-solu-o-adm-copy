import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  FileText,
  Edit,
  Building2,
  Users,
  Banknote,
  AlertCircle,
  Printer,
  HardHat,
  Plus,
  History
} from 'lucide-react';
import EntregaEPIModal from '@/components/epi/EntregaEPIModal';
import HistoricoEPIModal from '@/components/epi/HistoricoEPIModal';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function FuncionarioViewer({ isOpen, funcionario, onClose, onEdit, onUpdated }) {
  const [cargo, setCargo] = useState(null);
  const [departamento, setDepartamento] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEntregaEPI, setShowEntregaEPI] = useState(false);
  const [showHistoricoEPI, setShowHistoricoEPI] = useState(false);

  useEffect(() => {
    const fetchRelatedData = async () => {
      if (!funcionario) return;

      setIsLoading(true);
      try {
        const promises = [];

        if (funcionario.cargo_id) {
          promises.push(
            base44.entities.Cargo.filter({ id: funcionario.cargo_id }).then((data) => data[0])
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        if (funcionario.departamento_id) {
          promises.push(
            base44.entities.Departamento.filter({ id: funcionario.departamento_id }).then((data) => data[0])
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        const [cargoData, departamentoData] = await Promise.all(promises);
        setCargo(cargoData);
        setDepartamento(departamentoData);
      } catch (error) {
        console.error('Erro ao carregar dados relacionados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && funcionario) {
      fetchRelatedData();
    }
  }, [isOpen, funcionario]);

  if (!funcionario) return null;

  const handlePrint = () => {
    if (!funcionario?.id) return;
    const url = `/FichaFuncionario?id=${funcionario.id}`;
    window.open(url, '_blank');
  };

  const getStatusConfig = (status) => {
    const configs = {
      ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      experiencia: { label: 'Em Experiência', className: 'bg-amber-100 text-amber-700 border-amber-300' },
      ferias: { label: 'Em Férias', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      afastado: { label: 'Afastado', className: 'bg-orange-100 text-orange-700 border-orange-300' },
      demitido: { label: 'Demitido', className: 'bg-red-100 text-red-700 border-red-300' }
    };
    return configs[status] || configs.ativo;
  };

  const getRegimeLabel = (regime) => {
    const regimes = {
      clt: 'CLT',
      pj: 'PJ',
      estagio: 'Estágio',
      aprendiz: 'Aprendiz',
      temporario: 'Temporário',
      terceirizado: 'Terceirizado'
    };
    return regimes[regime] || regime;
  };

  const statusConfig = getStatusConfig(funcionario.status);

  const InfoSection = ({ title, icon: Icon, children }) =>
  <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="w-5 h-5 text-slate-700" />
          </div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="space-y-3">
          {children}
        </div>
      </CardContent>
    </Card>;


  const InfoItem = ({ label, value, icon: Icon }) =>
  <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-900 mt-0.5 break-words">{value || '-'}</p>
      </div>
    </div>;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto modern-modal p-0">
        <DialogHeader className="px-6 py-5 bg-slate-800 text-white border-b border-slate-700 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {funcionario.nome}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${statusConfig.className} border px-3 py-1 font-semibold`}>
                  {statusConfig.label}
                </Badge>
                {funcionario.regime &&
                <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                    {getRegimeLabel(funcionario.regime)}
                  </Badge>
                }
                {funcionario.cargo_id && cargo &&
                <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                    {cargo.nome}
                  </Badge>
                }
                {funcionario.data_fim_experiencia && new Date(funcionario.data_fim_experiencia) > new Date() &&
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Experiência até {formatDate(funcionario.data_fim_experiencia)}
                  </Badge>
                }
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setShowEntregaEPI(true)}
                variant="outline"
                size="sm"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 gap-2"
              >
                <HardHat className="w-4 h-4" />
                Entregar EPI
              </Button>
              <Button
                onClick={() => setShowHistoricoEPI(true)}
                variant="outline"
                size="sm"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 gap-2"
              >
                <History className="w-4 h-4" />
                Histórico EPI
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                onClick={() => onEdit(funcionario)}
                size="sm"
                className="gap-2 bg-white text-slate-800 hover:bg-white/90"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ?
        <div className="py-12 text-center text-slate-500">
            Carregando informações...
          </div> :

        <div className="space-y-4 p-6">
            {/* Informações Profissionais */}
            <InfoSection title="Informações Profissionais" icon={Briefcase}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                label="Cargo"
                value={cargo?.nome || 'Não especificado'}
                icon={Briefcase} />

                <InfoItem
                label="Departamento"
                value={departamento?.nome || 'Não especificado'}
                icon={Building2} />

                <InfoItem
                label="Data de Início"
                value={formatDate(funcionario.data_inicio)}
                icon={Calendar} />

                <InfoItem
                label="Salário"
                value={formatCurrency(funcionario.salario)}
                icon={Banknote} />

              </div>
            </InfoSection>

            {/* Informações Pessoais */}
            <InfoSection title="Informações Pessoais" icon={User}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                label="CPF"
                value={funcionario.cpf}
                icon={FileText} />

                <InfoItem
                label="RG"
                value={funcionario.rg}
                icon={FileText} />

                <InfoItem
                label="Data de Nascimento"
                value={formatDate(funcionario.data_nascimento)}
                icon={Calendar} />

                <InfoItem
                label="Email"
                value={funcionario.email}
                icon={Mail} />

                <InfoItem
                label="Telefone"
                value={funcionario.telefone}
                icon={Phone} />

                <InfoItem
                label="Telefone 2"
                value={funcionario.telefone2}
                icon={Phone} />

              </div>
            </InfoSection>

            {/* Contato de Emergência */}
            {(funcionario.contato_emergencia || funcionario.telefone_emergencia) &&
          <InfoSection title="Contato de Emergência" icon={AlertCircle}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoItem
                label="Nome"
                value={funcionario.contato_emergencia}
                icon={User} />

                  <InfoItem
                label="Telefone"
                value={funcionario.telefone_emergencia}
                icon={Phone} />

                  <InfoItem
                label="Parentesco"
                value={funcionario.parente_emergencia}
                icon={Users} />

                </div>
              </InfoSection>
          }

            {/* Endereço */}
            {(funcionario.logradouro || funcionario.cidade) &&
          <InfoSection title="Endereço" icon={MapPin}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem
                label="CEP"
                value={funcionario.cep} />

                  <InfoItem
                label="Logradouro"
                value={funcionario.logradouro} />

                  <InfoItem
                label="Número"
                value={funcionario.numero} />

                  <InfoItem
                label="Complemento"
                value={funcionario.complemento} />

                  <InfoItem
                label="Bairro"
                value={funcionario.bairro} />

                  <InfoItem
                label="Cidade"
                value={funcionario.cidade} />

                  <InfoItem
                label="UF"
                value={funcionario.uf} />

                </div>
              </InfoSection>
          }

            {/* Dados Bancários */}
            {(funcionario.banco || funcionario.conta || funcionario.pix) &&
          <InfoSection title="Dados Bancários" icon={CreditCard}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem
                label="Banco"
                value={funcionario.banco} />

                  <InfoItem
                label="Tipo de Conta"
                value={funcionario.tipo_conta} />

                  <InfoItem
                label="Agência"
                value={funcionario.agencia} />

                  <InfoItem
                label="Conta"
                value={funcionario.conta} />

                  {funcionario.pix &&
              <InfoItem
                label="Chave PIX"
                value={funcionario.pix}
                icon={CreditCard} />

              }
                </div>
              </InfoSection>
          }

            {/* Observações */}
            {funcionario.observacoes &&
          <InfoSection title="Observações" icon={FileText}>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {funcionario.observacoes}
                </p>
              </InfoSection>
          }
          </div>
        }

        {/* Modal de Entrega de EPI */}
        <EntregaEPIModal
          isOpen={showEntregaEPI}
          onClose={() => setShowEntregaEPI(false)}
          funcionario={funcionario}
          onSave={() => {
            setShowEntregaEPI(false);
          }}
        />

        {/* Modal de Histórico de EPI */}
        <HistoricoEPIModal
          isOpen={showHistoricoEPI}
          onClose={() => setShowHistoricoEPI(false)}
          funcionario={funcionario}
        />
      </DialogContent>
    </Dialog>);

}