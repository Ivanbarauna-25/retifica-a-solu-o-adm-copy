
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { base44 } from "@/api/base44Client";
import { Loader2 } from 'lucide-react';

export default function MeuPerfilPage() {
  const [user, setUser] = useState(null);
  const [funcionario, setFuncionario] = useState(null);
  const [cargo, setCargo] = useState(null);
  const [departamento, setDepartamento] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Verificar autenticação
        const authed = await base44.auth.isAuthenticated();
        if (!authed) {
          setUser(null);
          toast({
            title: "Sessão inválida",
            description: "Faça login novamente para acessar seu perfil.",
            variant: "destructive",
          });
          return;
        }

        // Buscar dados do usuário
        const userData = await base44.auth.me();
        setUser(userData);

        // Se o usuário tem funcionario_id, buscar dados do funcionário
        const funcionarioId = userData.funcionario_id;
        
        // Validar se funcionario_id não é um valor especial
        if (funcionarioId && 
            funcionarioId !== 'unassigned' && 
            funcionarioId !== 'todos' && 
            funcionarioId !== 'all' && 
            funcionarioId !== 'null' && 
            funcionarioId !== 'undefined') {
          try {
            const funcionarios = await base44.entities.Funcionario.filter({ 
              id: funcionarioId 
            });
            
            if (funcionarios && funcionarios.length > 0) {
              const func = funcionarios[0];
              setFuncionario(func);

              // Buscar cargo - validar cargo_id
              const cargoId = func.cargo_id;
              if (cargoId && 
                  cargoId !== 'unassigned' && 
                  cargoId !== 'todos' && 
                  cargoId !== 'all' && 
                  cargoId !== 'null' && 
                  cargoId !== 'undefined') {
                const cargos = await base44.entities.Cargo.filter({ 
                  id: cargoId 
                });
                if (cargos && cargos.length > 0) {
                  setCargo(cargos[0]);
                }
              }

              // Buscar departamento - validar departamento_id
              const departamentoId = func.departamento_id;
              if (departamentoId && 
                  departamentoId !== 'unassigned' && 
                  departamentoId !== 'todos' && 
                  departamentoId !== 'all' && 
                  departamentoId !== 'null' && 
                  departamentoId !== 'undefined') {
                const departamentos = await base44.entities.Departamento.filter({ 
                  id: departamentoId 
                });
                if (departamentos && departamentos.length > 0) {
                  setDepartamento(departamentos[0]);
                }
              }
            }
          } catch (err) {
            console.error('Erro ao buscar dados do funcionário:', err);
          }
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar suas informações.",
          variant: "destructive",
        });
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster />
        <div className="container mx-auto max-w-2xl py-8">
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Você precisa estar autenticado para visualizar esta página.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="bg-slate-800 hover:bg-slate-700">
                Entrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>
              {funcionario 
                ? 'Suas informações pessoais e dados do funcionário vinculado'
                : 'Suas informações pessoais (usuário não vinculado a funcionário)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Dados do Usuário */}
              <div className="space-y-4 pb-6 border-b">
                <h3 className="text-lg font-semibold text-slate-800">Dados de Acesso</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input 
                    id="full_name" 
                    value={user.full_name || ''} 
                    disabled 
                    className="bg-gray-50" />
                  <p className="text-xs text-gray-500">
                    Este campo é gerenciado pelo sistema de autenticação.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user.email || ''} 
                    disabled 
                    className="bg-gray-50" />
                  <p className="text-xs text-gray-500">
                    Este campo é gerenciado pelo sistema de autenticação.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Perfil de Acesso</Label>
                  <Input 
                    id="role" 
                    value={user.role === 'admin' ? 'Administrador' : 'Usuário'} 
                    disabled 
                    className="bg-gray-50" />
                </div>
              </div>

              {/* Dados do Funcionário */}
              {funcionario ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800">Dados do Funcionário</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input 
                      id="cargo" 
                      value={cargo?.nome || 'Não definido'} 
                      disabled 
                      className="bg-gray-50" />
                    <p className="text-xs text-gray-500">
                      Este campo é definido no cadastro do funcionário.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departamento">Departamento</Label>
                    <Input 
                      id="departamento" 
                      value={departamento?.nome || 'Não definido'} 
                      disabled 
                      className="bg-gray-50" />
                    <p className="text-xs text-gray-500">
                      Este campo é definido no cadastro do funcionário.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input 
                      id="status" 
                      value={funcionario.status || ''} 
                      disabled 
                      className="bg-gray-50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regime">Regime de Contratação</Label>
                    <Input 
                      id="regime" 
                      value={funcionario.regime?.toUpperCase() || ''} 
                      disabled 
                      className="bg-gray-50" />
                  </div>

                  {funcionario.data_inicio && (
                    <div className="space-y-2">
                      <Label htmlFor="data_inicio">Data de Início</Label>
                      <Input 
                        id="data_inicio" 
                        value={new Date(funcionario.data_inicio).toLocaleDateString('pt-BR')} 
                        disabled 
                        className="bg-gray-50" />
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-800">
                      <strong>📌 Importante:</strong> Para alterar cargo, departamento ou outros dados profissionais, 
                      solicite ao seu gestor ou acesse o cadastro de funcionários (se tiver permissão).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Atenção:</strong> Seu usuário não está vinculado a nenhum funcionário. 
                    Entre em contato com o administrador do sistema para configurar o vínculo.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
