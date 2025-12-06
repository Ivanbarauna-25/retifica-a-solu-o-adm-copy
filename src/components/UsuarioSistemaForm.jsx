import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function UsuarioSistemaForm({ isOpen, onClose, onSave, usuario = null }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
    funcionario_id: '',
    status_convite: 'ativo',
    pode_aprovar: []
  });
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFuncionarios, setIsFetchingFuncionarios] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFuncionarios();
      if (usuario) {
        setFormData({
          full_name: usuario.full_name || '',
          email: usuario.email || '',
          role: usuario.role || 'user',
          funcionario_id: usuario.funcionario_id || '',
          status_convite: usuario.status_convite || 'ativo',
          pode_aprovar: usuario.pode_aprovar || []
        });
      } else {
        setFormData({
          full_name: '',
          email: '',
          role: 'user',
          funcionario_id: '',
          status_convite: 'ativo',
          pode_aprovar: []
        });
      }
    }
  }, [isOpen, usuario]);

  const fetchFuncionarios = async () => {
    setIsFetchingFuncionarios(true);
    try {
      const allFuncionarios = await base44.entities.Funcionario.list();
      setFuncionarios(allFuncionarios || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast({
        title: 'Erro ao carregar funcionários',
        description: 'Não foi possível carregar a lista de funcionários.',
        variant: 'destructive'
      });
    } finally {
      setIsFetchingFuncionarios(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação: funcionário é obrigatório
    if (!formData.funcionario_id) {
      toast({
        title: 'Funcionário obrigatório',
        description: 'Todo usuário deve estar vinculado a um funcionário.',
        variant: 'destructive'
      });
      return;
    }

    // Validação: email é obrigatório
    if (!formData.email || !formData.email.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, informe um email válido.',
        variant: 'destructive'
      });
      return;
    }

    // Validação: nome é obrigatório
    if (!formData.full_name || formData.full_name.trim().length < 3) {
      toast({
        title: 'Nome inválido',
        description: 'Por favor, informe um nome com pelo menos 3 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Buscar dados do funcionário selecionado
      const funcionarioSelecionado = funcionarios.find(f => f.id === formData.funcionario_id);
      
      if (!funcionarioSelecionado) {
        throw new Error('Funcionário não encontrado');
      }

      const dadosUsuario = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        funcionario_id: formData.funcionario_id,
        status_convite: formData.status_convite,
        pode_aprovar: formData.pode_aprovar || []
      };

      if (usuario?.id) {
        // Atualizar usuário existente
        await base44.entities.User.update(usuario.id, dadosUsuario);
        
        toast({
          title: 'Usuário atualizado',
          description: 'As informações do usuário foram atualizadas com sucesso.'
        });
      } else {
        // Criar novo usuário
        await base44.entities.User.create(dadosUsuario);
        
        // Atualizar o funcionário com o ID do usuário (será feito via relacionamento)
        // O vínculo já foi estabelecido via funcionario_id no User
        
        toast({
          title: 'Usuário criado',
          description: `Usuário criado e vinculado ao funcionário ${funcionarioSelecionado.nome}.`
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o usuário.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tiposAprovacao = [
    { value: 'ferias', label: 'Férias' },
    { value: 'salario', label: 'Alteração Salarial' },
    { value: 'cargo', label: 'Alteração de Cargo' },
    { value: 'departamento', label: 'Alteração de Departamento' },
    { value: 'desligamento', label: 'Desligamento' },
    { value: 'adiantamento', label: 'Adiantamento' },
    { value: 'compras', label: 'Compras' }
  ];

  const toggleAprovacao = (tipo) => {
    setFormData(prev => {
      const pode_aprovar = prev.pode_aprovar || [];
      if (pode_aprovar.includes(tipo)) {
        return {
          ...prev,
          pode_aprovar: pode_aprovar.filter(t => t !== tipo)
        };
      } else {
        return {
          ...prev,
          pode_aprovar: [...pode_aprovar, tipo]
        };
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{usuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          <DialogDescription>
            {usuario 
              ? 'Atualize as informações do usuário do sistema'
              : 'Crie um novo usuário vinculado a um funcionário cadastrado'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alerta informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Importante:</strong> Todo usuário deve estar vinculado a um funcionário cadastrado. 
              Selecione o funcionário que terá acesso ao sistema.
            </p>
          </div>

          {/* Seleção de Funcionário - OBRIGATÓRIO */}
          <div className="space-y-2">
            <Label htmlFor="funcionario_id" className="required">
              Funcionário *
            </Label>
            {isFetchingFuncionarios ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando funcionários...
              </div>
            ) : (
              <Select
                value={formData.funcionario_id}
                onValueChange={(value) => {
                  const funcionario = funcionarios.find(f => f.id === value);
                  setFormData(prev => ({
                    ...prev,
                    funcionario_id: value,
                    // Preencher automaticamente o nome e email do funcionário
                    full_name: funcionario?.nome || prev.full_name,
                    email: funcionario?.email || prev.email
                  }));
                }}
                required>
                <SelectTrigger className="border-blue-300">
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      {func.nome} - {func.email || 'Sem email'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500">
              Selecione o funcionário que terá acesso ao sistema
            </p>
          </div>

          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Nome completo do usuário"
              required
            />
            <p className="text-xs text-gray-500">
              Preenchido automaticamente ao selecionar o funcionário
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
              required
            />
            <p className="text-xs text-gray-500">
              Email para login no sistema
            </p>
          </div>

          {/* Perfil de Acesso */}
          <div className="space-y-2">
            <Label htmlFor="role">Perfil de Acesso *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Administradores têm acesso total ao sistema
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status_convite}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status_convite: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissões de Aprovação */}
          <div className="space-y-3">
            <Label>Pode Aprovar</Label>
            <div className="grid grid-cols-2 gap-2">
              {tiposAprovacao.map((tipo) => (
                <label
                  key={tipo.value}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.pode_aprovar || []).includes(tipo.value)}
                    onChange={() => toggleAprovacao(tipo.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{tipo.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Selecione os tipos de solicitações que este usuário pode aprovar
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.funcionario_id}
              className="bg-slate-800 hover:bg-slate-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                usuario ? 'Atualizar' : 'Criar Usuário'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}