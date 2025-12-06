import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  UserPlus, 
  Trash2, 
  Search, 
  Shield, 
  Mail, 
  UserCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import UsuarioSistemaForm from '@/components/UsuarioSistemaForm';
import PermissoesModal from '@/components/PermissoesModal';
import { getRoleLabel, getRoleColor } from '@/components/permissions';
import ProtectedPage from '@/components/ProtectedPage';

export default function GestaoUsuariosPage() {
  const [users, setUsers] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPermissoesOpen, setIsPermissoesOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    // Só buscar dados se estiver dentro do ProtectedPage
    // ProtectedPage já verifica autenticação
    const loadData = async () => {
      try {
        // Verificar autenticação antes de buscar dados
        const authed = await base44.auth.isAuthenticated();
        if (!authed) {
          setIsLoading(false);
          return; // ProtectedPage vai redirecionar
        }
        
        await fetchData();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersData, funcsData, cargosData] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Funcionario.list(),
        base44.entities.Cargo.list()
      ]);
      setUsers(usersData || []);
      setFuncionarios(funcsData || []);
      setCargos(cargosData || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePermissoes = async (userId, permissoesData) => {
    try {
      await base44.entities.User.update(userId, permissoesData);
      toast({
        title: 'Permissões atualizadas!',
        description: 'As permissões do usuário foram atualizadas com sucesso.'
      });
      setIsPermissoesOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar as permissões.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await base44.entities.User.delete(userId);
      toast({
        title: 'Usuário excluído!',
        description: 'O usuário foi removido do sistema.'
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive'
      });
    }
  };

  // Helper para pegar dados do funcionário vinculado
  const getFuncionarioData = (funcionarioId) => {
    if (!funcionarioId) return null;
    return funcionarios.find(f => f.id === funcionarioId);
  };

  // Helper para pegar cargo do funcionário
  const getCargoNome = (funcionarioId) => {
    const func = getFuncionarioData(funcionarioId);
    if (!func || !func.cargo_id) return '-';
    const cargo = cargos.find(c => c.id === func.cargo_id);
    return cargo?.nome || '-';
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const funcionario = getFuncionarioData(user.funcionario_id);
    const cargoNome = getCargoNome(user.funcionario_id);
    
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      funcionario?.nome?.toLowerCase().includes(searchLower) ||
      cargoNome?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <ProtectedPage requiredModule="usuarios">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredModule="usuarios">
      <Toaster />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserCircle className="w-8 h-8" />
              Gestão de Usuários
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie usuários do sistema e suas permissões
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              setIsFormOpen(true);
            }}
            className="bg-slate-800 hover:bg-slate-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Como funcionam as permissões?
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Vincule o usuário a um funcionário</strong> para herdar as permissões do cargo</li>
                  <li>• <strong>Configure o "Role no Sistema"</strong> como fallback se não houver cargo</li>
                  <li>• <strong>Adicione permissões extras</strong> individuais se necessário</li>
                  <li>• <strong>Edite os cargos</strong> em Cadastros → Cargos para alterar permissões globalmente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, funcionário ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Role Sistema</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const funcionario = getFuncionarioData(user.funcionario_id);
                      const cargoNome = getCargoNome(user.funcionario_id);
                      const role = user.system_role || user.role || 'user';
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {funcionario ? (
                              <span className="text-sm">{funcionario.nome}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">Não vinculado</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cargoNome !== '-' ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {cargoNome}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(role)}>
                              {getRoleLabel(role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setIsPermissoesOpen(true);
                                }}
                                title="Editar Permissões"
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <UsuarioSistemaForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingUser(null);
          }}
          onSave={fetchData}
          user={editingUser}
        />

        <PermissoesModal
          isOpen={isPermissoesOpen}
          onClose={() => {
            setIsPermissoesOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSavePermissoes}
          user={editingUser}
        />
      </div>
    </ProtectedPage>
  );
}