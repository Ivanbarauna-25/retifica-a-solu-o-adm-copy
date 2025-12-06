import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getRoleLabel, getRoleColor, PERMISSIONS_MATRIX } from '@/components/permissions';
import { base44 } from '@/api/base44Client';
import { Shield, AlertCircle, Check, Info, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Helper para validar se é um ID válido do Base44
const isValidId = (id) => {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  // IDs da Base44 são UUIDs ou strings longas, não palavras como "outro"
  if (id.length < 10) return false;
  // Não pode ser palavras comuns
  const invalidIds = ['outro', 'outros', 'nenhum', 'none', 'null', 'undefined'];
  if (invalidIds.includes(id.toLowerCase())) return false;
  return true;
};

export default function PermissoesModal({ isOpen, onClose, user, onSave }) {
  const [formData, setFormData] = useState({
    system_role: 'user',
    pode_aprovar: [],
    funcionario_id: '',
    superior_id: '',
    departamento_id: ''
  });
  const [funcionarios, setFuncionarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [users, setUsers] = useState([]);
  const [cargoVinculado, setCargoVinculado] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        system_role: user.system_role || user.role || 'user',
        pode_aprovar: user.pode_aprovar || [],
        funcionario_id: user.funcionario_id || '',
        superior_id: user.superior_id || '',
        departamento_id: user.departamento_id || ''
      });
      fetchRelatedData();
    }
  }, [isOpen, user]);

  const fetchRelatedData = async () => {
    try {
      const [funcsData, deptsData, usersData] = await Promise.all([
        base44.entities.Funcionario.list(),
        base44.entities.Departamento.list(),
        base44.entities.User.list()
      ]);
      setFuncionarios(funcsData || []);
      setDepartamentos(deptsData || []);
      setUsers(usersData || []);

      // Buscar cargo do funcionário vinculado
      if (user?.funcionario_id && isValidId(user.funcionario_id)) {
        const func = funcsData?.find(f => f.id === user.funcionario_id);
        if (func?.cargo_id && isValidId(func.cargo_id)) {
          try {
            const cargos = await base44.entities.Cargo.filter({ id: func.cargo_id });
            if (cargos && cargos[0]) {
              setCargoVinculado(cargos[0]);
            }
          } catch (err) {
            console.warn('Erro ao buscar cargo:', err);
            setCargoVinculado(null);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const tiposAprovacao = [
    { value: 'ferias', label: 'Férias' },
    { value: 'salario', label: 'Reajuste Salarial' },
    { value: 'cargo', label: 'Alteração de Cargo' },
    { value: 'departamento', label: 'Mudança de Departamento' },
    { value: 'desligamento', label: 'Desligamento' },
    { value: 'adiantamento', label: 'Adiantamento' },
    { value: 'compras', label: 'Compras' }
  ];

  const handleToggleAprovacao = (tipo) => {
    setFormData(prev => {
      const current = prev.pode_aprovar || [];
      if (current.includes(tipo)) {
        return { ...prev, pode_aprovar: current.filter(t => t !== tipo) };
      } else {
        return { ...prev, pode_aprovar: [...current, tipo] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, formData);
  };

  const roleAtual = formData.system_role;
  const permissoesRole = PERMISSIONS_MATRIX[roleAtual] || { modulos: [], acoes: [], pode_aprovar: [] };

  // Verificar se tem permissões herdadas do cargo
  const permissoesCargo = cargoVinculado ? {
    modulos: cargoVinculado.permissoes_modulos || [],
    acoes: cargoVinculado.permissoes_acoes || [],
    pode_aprovar: cargoVinculado.permissoes_aprovacao || []
  } : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Gerenciar Permissões - {user?.full_name || user?.email}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Permissões Herdadas do Cargo */}
          {permissoesCargo && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5" />
                🎯 Permissões Herdadas do Cargo: {cargoVinculado.nome}
              </h4>
              
              <div className="space-y-3 text-sm">
                {/* Módulos do Cargo */}
                {permissoesCargo.modulos.length > 0 && (
                  <div>
                    <span className="font-medium text-blue-800">📋 Módulos Acessíveis:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissoesCargo.modulos.map(mod => (
                        <Badge key={mod} className="bg-blue-100 text-blue-800 border-blue-300">
                          {mod}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações do Cargo */}
                {permissoesCargo.acoes.length > 0 && (
                  <div>
                    <span className="font-medium text-blue-800">⚡ Ações Permitidas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissoesCargo.acoes.map(acao => (
                        <Badge key={acao} className="bg-green-100 text-green-800 border-green-300">
                          {acao}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aprovações do Cargo */}
                {permissoesCargo.pode_aprovar.length > 0 && (
                  <div>
                    <span className="font-medium text-blue-800">✅ Pode Aprovar:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissoesCargo.pode_aprovar.map(aprov => (
                        <Badge key={aprov} className="bg-purple-100 text-purple-800 border-purple-300">
                          {tiposAprovacao.find(t => t.value === aprov)?.label || aprov}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-blue-300">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Estas permissões vêm do cargo "{cargoVinculado.nome}" vinculado ao funcionário. 
                  Para alterá-las, edite o cargo na página Cadastros → Cargos.
                </p>
              </div>
            </div>
          )}

          {/* Role do Sistema */}
          <div>
            <Label>Role no Sistema (Fallback) *</Label>
            <Select
              value={formData.system_role}
              onValueChange={(value) => setFormData({ ...formData, system_role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('admin')}>Admin</Badge>
                    <span className="text-xs text-gray-500">Acesso total</span>
                  </div>
                </SelectItem>
                <SelectItem value="rh">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('rh')}>RH</Badge>
                    <span className="text-xs text-gray-500">Gestão de pessoal</span>
                  </div>
                </SelectItem>
                <SelectItem value="gerente">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('gerente')}>Gerente</Badge>
                    <span className="text-xs text-gray-500">Gestão operacional</span>
                  </div>
                </SelectItem>
                <SelectItem value="financeiro">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('financeiro')}>Financeiro</Badge>
                    <span className="text-xs text-gray-500">Gestão financeira</span>
                  </div>
                </SelectItem>
                <SelectItem value="vendedor">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('vendedor')}>Vendedor</Badge>
                    <span className="text-xs text-gray-500">OS e orçamentos</span>
                  </div>
                </SelectItem>
                <SelectItem value="mecanico">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('mecanico')}>Mecânico</Badge>
                    <span className="text-xs text-gray-500">Apenas suas OS</span>
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor('user')}>Usuário</Badge>
                    <span className="text-xs text-gray-500">Acesso básico</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Usado apenas quando não há cargo vinculado ao funcionário
            </p>
          </div>

          {/* Resumo de Permissões do Role */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Permissões Padrão do Role {getRoleLabel(roleAtual)}
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium">Módulos:</span> {permissoesRole.modulos.join(', ') || 'Nenhum'}
              </div>
              <div>
                <span className="font-medium">Ações:</span> {permissoesRole.acoes.join(', ') || 'Nenhuma'}
              </div>
              <div>
                <span className="font-medium">Pode aprovar:</span>{' '}
                {permissoesRole.pode_aprovar.length > 0 ? 
                  permissoesRole.pode_aprovar.join(', ') : 
                  'Nenhuma aprovação padrão'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Permissões Adicionais de Aprovação */}
          <div>
            <Label className="mb-3 block text-base font-semibold">
              ➕ Permissões Adicionais de Aprovação
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Marque para conceder permissões extras além das automáticas do cargo/role
            </p>
            <div className="space-y-2 border rounded-lg p-4 bg-white">
              {tiposAprovacao.map((tipo) => {
                const jaNoCargo = permissoesCargo?.pode_aprovar.includes(tipo.value);
                const jaNoRole = permissoesRole.pode_aprovar.includes(tipo.value);
                
                return (
                  <div key={tipo.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`aprovacao-${tipo.value}`}
                      checked={(formData.pode_aprovar || []).includes(tipo.value)}
                      onCheckedChange={() => handleToggleAprovacao(tipo.value)}
                    />
                    <Label htmlFor={`aprovacao-${tipo.value}`} className="cursor-pointer text-sm flex-1">
                      {tipo.label}
                    </Label>
                    {jaNoCargo && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        Já no cargo
                      </Badge>
                    )}
                    {jaNoRole && !jaNoCargo && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                        Já no role
                      </Badge>
                    )}
                    {(formData.pode_aprovar || []).includes(tipo.value) && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vínculos */}
          <div className="space-y-4">
            <div>
              <Label>Funcionário Vinculado</Label>
              <Select
                value={formData.funcionario_id}
                onValueChange={(value) => setFormData({ ...formData, funcionario_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum funcionário</SelectItem>
                  {funcionarios.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      {func.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Vinculando a um funcionário, o usuário herda as permissões do cargo dele
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Superior Hierárquico (Chefe Direto)
              </Label>
              <Select
                value={formData.superior_id}
                onValueChange={(value) => setFormData({ ...formData, superior_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum superior</SelectItem>
                  {users.filter(u => u.id !== user?.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                📌 Selecione outro usuário que é o gerente/coordenador deste usuário
              </p>
            </div>

            <div>
              <Label>Departamento</Label>
              <Select
                value={formData.departamento_id}
                onValueChange={(value) => setFormData({ ...formData, departamento_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum departamento</SelectItem>
                  {departamentos.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-700">
              Salvar Permissões
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}