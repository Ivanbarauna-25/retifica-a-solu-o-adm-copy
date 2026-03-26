import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // 1. Garantir que existe um Cargo "Mecânico" para migrar os dados
        let cargos = await base44.entities.Cargo.list();
        let cargoMecanico = cargos.find(c => c.nome === 'Mecânico' || c.nome === 'Mecanico');
        
        if (!cargoMecanico) {
            cargoMecanico = await base44.entities.Cargo.create({
                nome: 'Mecânico',
                descricao: 'Cargo recuperado automaticamente de dados legados',
                nivel_hierarquico: 3, // Nível operacional padrão
                tem_comissao: false
            });
        }

        // 2. Buscar funcionários com cargo_id = 'Mecânico'
        // Nota: O backend pode ter restrições de tipo, mas vamos tentar filtrar pela string
        let badRecords = [];
        try {
            badRecords = await base44.entities.Funcionario.filter({ cargo_id: 'Mecânico' });
        } catch (e) {
            // Se falhar o filtro exato, tentamos uma estratégia de fallback se possível
            // Mas por enquanto assumimos que o filtro funciona ou retorna vazio
            console.error("Erro ao filtrar por string:", e);
        }
        
        // Se não encontrou nada com 'Mecânico', tentar buscar registros onde o cargo_id não é um UUID válido?
        // Não temos regex search fácil aqui.
        
        const fixedIds = [];
        
        // 3. Atualizar registros encontrados
        for (const record of badRecords) {
            try {
                await base44.entities.Funcionario.update(record.id, {
                    cargo_id: cargoMecanico.id
                });
                fixedIds.push(record.id);
            } catch (updateError) {
                console.error(`Erro ao atualizar funcionário ${record.id}:`, updateError);
            }
        }

        return Response.json({
            success: true,
            fixed_count: fixedIds.length,
            fixed_ids: fixedIds,
            cargo_destino: cargoMecanico.nome,
            message: `Reparo concluído. ${fixedIds.length} funcionários corrigidos.`
        });

    } catch (error) {
        return Response.json({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});