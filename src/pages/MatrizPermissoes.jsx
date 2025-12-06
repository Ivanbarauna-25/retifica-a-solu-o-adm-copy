import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, Eye, Search, Users, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ProtectedPage from '@/components/ProtectedPage';

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

function MatrizPermissoesPage() {
  const [cargos, setCargos] = useState([]);
  const [users, setUsers] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cargosData, usersData, funcsData] = await Promise.all([
        base44.entities.Cargo.list(),
        base44.entities.User.list(),
        base44.entities.Funcionario.list()
      ]);
      
      setCargos(cargosData || []);
      setUsers(usersData || []);
      setFuncionarios(funcsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargosFiltrados = cargos.filter(cargo =>
    cargo.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const getUsersByCargo = (cargoId) => {
    if (!isValidId(cargoId)) return [];
    
    const funcsComCargo = funcionarios.filter(f => f.cargo_id === cargoId);
    const funcIds = funcsComCargo.map(f => f.id);
    return users.filter(u => funcIds.includes(u.funcionario_id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Matriz de Permissões
          </h1>
          <p className="text-gray-600 mt-1">
            Visualize e compare as permissões de todos os cargos do sistema
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Cargos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cargos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cargos com Permissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cargos.filter(c => 
                (c.permissoes_modulos?.length || 0) > 0 ||
                (c.permissoes_acoes?.length || 0) > 0 ||
                (c.permissoes_aprovacao?.length || 0) > 0
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar cargo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Visualização */}
      <Tabs defaultValue="por-cargo" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="por-cargo">
            <FileText className="w-4 h-4 mr-2" />
            Por Cargo
          </TabsTrigger>
          <TabsTrigger value="comparacao">
            <Eye className="w-4 h-4 mr-2" />
            Comparação
          </TabsTrigger>
        </TabsList>

        {/* Visualização por Cargo */}
        <TabsContent value="por-cargo" className="space-y-4">
          {cargosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhum cargo encontrado
              </CardContent>
            </Card>
          ) : (
            cargosFiltrados.map(cargo => {
              const usuariosComCargo = getUsersByCargo(cargo.id);
              const totalPermissoes = 
                (cargo.permissoes_modulos?.length || 0) +
                (cargo.permissoes_acoes?.length || 0) +
                (cargo.permissoes_aprovacao?.length || 0);

              return (
                <Card key={cargo.id}>
                  <CardHeader className="bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          {cargo.nome}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {cargo.descricao || 'Sem descrição'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Nível Hierárquico</div>
                          <Badge className="bg-slate-700 text-white">
                            Nível {cargo.nivel_hierarquico || 5}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Usuários</div>
                          <Badge className="bg-blue-600 text-white flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {usuariosComCargo.length}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Permissões</div>
                          <Badge className="bg-green-600 text-white">
                            {totalPermissoes}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Módulos */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          📋 Módulos ({cargo.permissoes_modulos?.length || 0})
                        </h4>
                        {cargo.permissoes_modulos && cargo.permissoes_modulos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cargo.permissoes_modulos.map(mod => (
                              <Badge key={mod} variant="outline" className="text-xs">
                                {mod}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Nenhum módulo</p>
                        )}
                      </div>

                      {/* Ações */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          ⚡ Ações ({cargo.permissoes_acoes?.length || 0})
                        </h4>
                        {cargo.permissoes_acoes && cargo.permissoes_acoes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cargo.permissoes_acoes.map(acao => (
                              <Badge key={acao} variant="outline" className="text-xs bg-green-50">
                                {acao}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Nenhuma ação</p>
                        )}
                      </div>

                      {/* Aprovações */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          ✅ Aprovações ({cargo.permissoes_aprovacao?.length || 0})
                        </h4>
                        {cargo.permissoes_aprovacao && cargo.permissoes_aprovacao.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cargo.permissoes_aprovacao.map(aprov => (
                              <Badge key={aprov} variant="outline" className="text-xs bg-purple-50">
                                {aprov}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Nenhuma aprovação</p>
                        )}
                      </div>
                    </div>

                    {/* Usuários com este cargo */}
                    {usuariosComCargo.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-2 text-sm text-gray-700">
                          Usuários com este cargo:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {usuariosComCargo.map(u => (
                            <Badge key={u.id} variant="secondary" className="text-xs">
                              {u.full_name || u.email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Visualização de Comparação */}
        <TabsContent value="comparacao">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Cargo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Módulos</TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead>Aprovações</TableHead>
                    <TableHead>Total Permissões</TableHead>
                    <TableHead>Usuários</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cargosFiltrados.map(cargo => {
                    const usuariosComCargo = getUsersByCargo(cargo.id);
                    const totalPermissoes = 
                      (cargo.permissoes_modulos?.length || 0) +
                      (cargo.permissoes_acoes?.length || 0) +
                      (cargo.permissoes_aprovacao?.length || 0);

                    return (
                      <TableRow key={cargo.id}>
                        <TableCell className="font-medium">{cargo.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Nível {cargo.nivel_hierarquico || 5}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{cargo.permissoes_modulos?.length || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            {cargo.permissoes_acoes?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-800">
                            {cargo.permissoes_aprovacao?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-600 text-white">{totalPermissoes}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{usuariosComCargo.length}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MatrizPermissoes() {
  return (
    <ProtectedPage requiredModule="usuarios">
      <MatrizPermissoesPage />
    </ProtectedPage>
  );
}