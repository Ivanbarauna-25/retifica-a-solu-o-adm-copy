import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Processa importação de batidas do relógio
 * Detecta formato (TXT/XML), normaliza e retorna preview
 */

// Detectar formato
function detectarFormato(conteudo) {
  const trimmed = conteudo.trim();
  
  if (trimmed.startsWith('<') && trimmed.includes('</')) {
    return 'xml';
  }
  
  if (trimmed.includes('# DeviceModel') || trimmed.includes('# DataType') || trimmed.includes('No\t')) {
    return 'txt_attendlog';
  }
  
  if (trimmed.split('\n').some(l => l.split('\t').length > 5)) {
    return 'txt_tabulado';
  }
  
  return 'desconhecido';
}

// Parser TXT AttendLog (TSV - Tab Separated Values)
function parseTXTAttendLog(conteudo) {
  const linhas = conteudo.split('\n');
  const registros = [];
  const metadados = [];
  let headerDetected = false;
  
  for (const linha of linhas) {
    const limpa = linha.replace(/\r/g, '');
    
    if (!limpa.trim()) continue;
    
    // Metadados (#)
    if (limpa.startsWith('#')) {
      metadados.push(limpa);
      continue;
    }
    
    // Header (No	TMNo	EnNo	Name...)
    if (limpa.includes('No\t') && limpa.includes('EnNo') && limpa.includes('DateTime')) {
      headerDetected = true;
      continue;
    }
    
    if (!headerDetected) continue;
    
    // Parsing TSV: split por TAB, preservando campos vazios
    // Formato: No	TMNo	EnNo	Name	GMNo	Mode	IN/OUT	Antipass	DaiGong	DateTime	TR
    // Índices:   0    1     2     3     4     5      6        7         8        9        10
    
    try {
      const campos = limpa.split('\t');
      
      // Mínimo: precisa ter EnNo (índice 2) e DateTime (índice 9)
      if (campos.length < 10) continue;
      
      const no = (campos[0] || '').trim();
      const tmNo = (campos[1] || '').trim();
      const enNo = (campos[2] || '').trim();
      const name = (campos[3] || '').trim();
      const gmNo = (campos[4] || '').trim();
      const mode = (campos[5] || '').trim();
      const inOut = (campos[6] || '').trim();
      const antipass = (campos[7] || '').trim();
      const daiGong = (campos[8] || '').trim();
      const dateTime = (campos[9] || '').trim();
      const tr = (campos[10] || '').trim();
      
      // Normalizar DateTime: pode ter múltiplos espaços entre data e hora
      const dateTimeNormalizado = dateTime.replace(/\s+/g, ' ').trim();
      
      if (!enNo || !dateTimeNormalizado) continue;
      
      registros.push({
        no,
        tmNo,
        enNo,
        name,
        gmNo,
        mode,
        inOut,
        antipass,
        daiGong,
        dateTime: dateTimeNormalizado,
        tr,
        raw: limpa
      });
    } catch (e) {
      // Ignorar linha com erro
    }
  }
  
  return { registros, metadados };
}

// Parser XML genérico
function parseXML(conteudo) {
  const registros = [];
  
  // Sinônimos de campos
  const sinonimos = {
    userId: ['enno', 'userid', 'idusuario', 'employeeid', 'pin', 'usercode', 'id'],
    name: ['name', 'username', 'nome', 'employeename', 'fullname'],
    dateTime: ['datetime', 'time', 'timestamp', 'date', 'logdate', 'logtime', 'checktime'],
    deviceId: ['tmno', 'terminalid', 'deviceid', 'machineid', 'serialnumber'],
    mode: ['mode', 'verifymode', 'checktype', 'type', 'status']
  };
  
  // Extrair registros do XML
  const recordTags = ['row', 'record', 'attendance', 'log', 'entry', 'check'];
  
  try {
    // Parse básico XML (sem dependências externas)
    for (const recordTag of recordTags) {
      const regex = new RegExp(`<${recordTag}[^>]*>([\\s\\S]*?)<\\/${recordTag}>`, 'gi');
      const matches = conteudo.matchAll(regex);
      
      for (const match of matches) {
        const recordContent = match[1];
        const record = {};
        
        // Extrair campos do registro
        const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
        const fieldMatches = recordContent.matchAll(fieldRegex);
        
        for (const [, fieldName, fieldValue] of fieldMatches) {
          const lowerField = fieldName.toLowerCase();
          
          // Mapear para campos padronizados
          if (sinonimos.userId.includes(lowerField)) {
            record.enNo = fieldValue.trim();
          } else if (sinonimos.name.includes(lowerField)) {
            record.name = fieldValue.trim();
          } else if (sinonimos.dateTime.includes(lowerField)) {
            record.dateTime = fieldValue.trim();
          } else if (sinonimos.deviceId.includes(lowerField)) {
            record.tmNo = fieldValue.trim();
          } else if (sinonimos.mode.includes(lowerField)) {
            record.mode = fieldValue.trim();
          }
        }
        
        if (record.enNo && record.dateTime) {
          registros.push({
            ...record,
            raw: match[0].substring(0, 500)
          });
        }
      }
    }
  } catch (e) {
    throw new Error(`Erro ao parsear XML: ${e.message}`);
  }
  
  return { registros, metadados: [] };
}

// Normalizar para PontoRegistro
async function normalizar(registros, base44) {
  const funcionarios = await base44.entities.Funcionario.list();
  const normalizados = [];
  
  for (const reg of registros) {
    try {
      const enNo = String(reg.enNo || '').trim();
      
      if (!enNo) {
        normalizados.push({
          valido: false,
          motivo_invalido: 'EnNo vazio',
          raw: reg.raw
        });
        continue;
      }
      
      // Validar que EnNo é numérico
      if (!/^\d+$/.test(enNo)) {
        normalizados.push({
          valido: false,
          motivo_invalido: `EnNo não numérico: "${enNo}"`,
          user_id_relogio: enNo,
          raw: reg.raw
        });
        continue;
      }
      
      // Parse datetime
      let dataHora;
      try {
        const dt = reg.dateTime.trim();
        // Formatos: YYYY-MM-DD HH:mm:ss, YYYY/MM/DD HH:mm:ss, ISO
        const normalizado = dt.replace(/\//g, '-').replace(/T/, ' ').split('.')[0];
        dataHora = new Date(normalizado);
        
        if (isNaN(dataHora.getTime())) {
          throw new Error('Data inválida');
        }
      } catch (e) {
        normalizados.push({
          valido: false,
          motivo_invalido: `DateTime inválido: "${reg.dateTime}"`,
          user_id_relogio: enNo,
          raw: reg.raw
        });
        continue;
      }
      
      const data = dataHora.toISOString().split('T')[0];
      const hora = dataHora.toISOString().split('T')[1].split('.')[0];
      
      // Buscar funcionário
      const funcionario = funcionarios.find(f => {
        if (!f || !f.user_id_relogio) return false;
        return String(f.user_id_relogio).trim() === enNo;
      });
      
      normalizados.push({
        funcionario_id: funcionario?.id || null,
        user_id_relogio: enNo,
        nome_detectado: reg.name || '',
        data,
        hora,
        data_hora: dataHora.toISOString(),
        origem: 'relogio',
        metodo: reg.mode || '',
        dispositivo_id: reg.tmNo || '',
        raw_linha: (reg.raw || '').substring(0, 500),
        valido: !!funcionario,
        motivo_invalido: funcionario ? null : 'Funcionário não vinculado ao ID do relógio',
        // Campos extras para preview
        _tr: reg.tr || '',
        _inOut: reg.inOut || ''
      });
    } catch (e) {
      normalizados.push({
        valido: false,
        motivo_invalido: `Erro ao normalizar: ${e.message}`,
        raw: reg.raw
      });
    }
  }
  
  return normalizados;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { conteudo, nome_arquivo } = body;
    
    if (!conteudo) {
      return Response.json({ error: 'Conteúdo obrigatório' }, { status: 400 });
    }
    
    // 1. Detectar formato
    const formato = detectarFormato(conteudo);
    
    if (formato === 'desconhecido') {
      return Response.json({
        success: false,
        error: 'Formato não reconhecido',
        formato_detectado: 'desconhecido',
        sugestao: 'Verifique se o arquivo é TXT (AttendLog) ou XML válido'
      });
    }
    
    // 2. Parsear
    let resultado;
    if (formato === 'txt_attendlog' || formato === 'txt_tabulado') {
      resultado = parseTXTAttendLog(conteudo);
    } else if (formato === 'xml') {
      resultado = parseXML(conteudo);
    }
    
    // 3. Normalizar
    const normalizados = await normalizar(resultado.registros, base44);
    
    // 4. Estatísticas
    const validos = normalizados.filter(r => r.valido).length;
    const invalidos = normalizados.filter(r => !r.valido).length;
    const semMapeamento = normalizados.filter(r => r.valido === false && r.motivo_invalido?.includes('não vinculado')).length;
    
    // IDs únicos sem mapeamento
    const idsSemMapeamento = [...new Set(
      normalizados
        .filter(r => !r.funcionario_id && r.user_id_relogio && /^\d+$/.test(r.user_id_relogio))
        .map(r => r.user_id_relogio)
    )];
    
    // Período
    const datas = normalizados.filter(r => r.data).map(r => r.data).sort();
    const periodo_inicio = datas[0] || null;
    const periodo_fim = datas[datas.length - 1] || null;
    
    // Preview (primeiras 20)
    const preview = normalizados.slice(0, 20);
    
    // Log de erros (primeiras 20 inválidas)
    const errosLog = normalizados
      .filter(r => !r.valido)
      .slice(0, 20)
      .map(r => `${r.motivo_invalido} | Raw: ${r.raw_linha || r.raw || ''}`)
      .join('\n');
    
    return Response.json({
      success: true,
      formato_detectado: formato,
      total_lidos: resultado.registros.length,
      total_validos: validos,
      total_invalidos: invalidos,
      total_sem_mapeamento: semMapeamento,
      ids_sem_mapeamento: idsSemMapeamento,
      periodo_inicio,
      periodo_fim,
      preview,
      registros_completos: normalizados,
      metadados: resultado.metadados.join('\n'),
      log_erros: errosLog,
      arquivo_nome: nome_arquivo || 'Conteúdo Colado'
    });
    
  } catch (error) {
    console.error('Erro no processamento:', error);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao processar importação',
      stack: error.stack
    }, { status: 500 });
  }
});