import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * IMPORTAÇÃO DIRETA DE PONTO
 * - TXT (AttendLog TSV)
 * - XLSX (export do relógio)
 * - Salva TODOS os registros (válidos e inválidos)
 * - Vincula por user_id_relogio (EnNo)
 */

// === PARSER TXT (AttendLog TSV) - DINÂMICO ===
function parseTXT(conteudo) {
  const linhas = conteudo.split('\n');
  const registros = [];
  let headerMap = null;

  for (const linha of linhas) {
    const limpa = linha.replace(/\r/g, '').trim();
    
    if (!limpa) continue;
    if (limpa.startsWith('#')) continue; // metadados
    
    // Detectar header dinamicamente
    if (!headerMap && (limpa.includes('EnNo') || limpa.includes('Name')) && limpa.includes('\t')) {
      const colunas = limpa.split('\t');
      headerMap = {};
      
      colunas.forEach((col, idx) => {
        const colLimpa = col.trim().toLowerCase();
        if (colLimpa === 'enno' || colLimpa === 'empno' || colLimpa === 'userid') {
          headerMap.enNo = idx;
        } else if (colLimpa === 'name' || colLimpa === 'nome' || colLimpa === 'employee') {
          headerMap.name = idx;
        } else if (colLimpa === 'datetime' || colLimpa === 'checktime' || colLimpa === 'timestamp') {
          headerMap.dateTime = idx;
        } else if (colLimpa === 'tmno' || colLimpa === 'deviceid') {
          headerMap.tmNo = idx;
        } else if (colLimpa === 'mode' || colLimpa === 'modo') {
          headerMap.mode = idx;
        } else if (colLimpa === 'tr' || colLimpa === 'type') {
          headerMap.tr = idx;
        }
      });
      
      continue;
    }
    
    if (!headerMap || headerMap.enNo === undefined || headerMap.dateTime === undefined) continue;
    
    const campos = limpa.split('\t');
    if (campos.length < 3) continue;
    
    const enNo = (campos[headerMap.enNo] || '').trim();
    const dateTime = (campos[headerMap.dateTime] || '').trim().replace(/\s+/g, ' ');
    
    if (!enNo || !dateTime) continue;
    
    registros.push({
      enNo,
      name: headerMap.name !== undefined ? (campos[headerMap.name] || '').trim() : '',
      dateTime,
      tmNo: headerMap.tmNo !== undefined ? (campos[headerMap.tmNo] || '').trim() : '',
      mode: headerMap.mode !== undefined ? (campos[headerMap.mode] || '').trim() : '',
      tr: headerMap.tr !== undefined ? (campos[headerMap.tr] || '').trim() : '',
      raw: limpa
    });
  }
  
  return registros;
}

// === PARSER XLSX ===
function parseXLSX(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  const registros = [];
  
  for (const row of rows) {
    // Identificar colunas por sinônimos
    const enNo = String(row['EnNo'] || row['EmpNo'] || row['UserID'] || row['ID'] || '').trim();
    const dateTime = String(row['DateTime'] || row['CheckTime'] || row['Timestamp'] || row['Data/Hora'] || '').trim();
    const name = String(row['Name'] || row['Nome'] || row['Employee'] || '').trim();
    const tmNo = String(row['TMNo'] || row['DeviceID'] || '').trim();
    const mode = String(row['Mode'] || row['Modo'] || '').trim();
    
    if (!enNo || !dateTime) continue;
    
    registros.push({
      enNo,
      name,
      dateTime,
      tmNo,
      mode,
      raw: JSON.stringify(row).substring(0, 500)
    });
  }
  
  return registros;
}

// === NORMALIZAR E VINCULAR ===
async function normalizar(registros, funcionarios) {
  const normalizados = [];
  
  for (const reg of registros) {
    const enNo = String(reg.enNo || '').trim();
    
    // Validar EnNo numérico
    if (!enNo || !/^\d+$/.test(enNo)) {
      normalizados.push({
        user_id_relogio: enNo || null,
        nome_detectado: reg.name || '',
        data_hora: null,
        data: null,
        hora: null,
        origem: 'relogio',
        metodo: reg.mode || '',
        dispositivo_id: reg.tmNo || '',
        raw_linha: (reg.raw || '').substring(0, 500),
        valido: false,
        motivo_invalido: !enNo ? 'EnNo vazio' : 'EnNo não numérico',
        funcionario_id: null
      });
      continue;
    }
    
    // Parse DateTime
    let dataHora;
    try {
      const dt = String(reg.dateTime || '').trim();
      if (!dt) throw new Error('DateTime vazio');
      
      // Normalizar formato
      const normalizado = dt.replace(/\//g, '-').replace(/T/, ' ').split('.')[0];
      dataHora = new Date(normalizado);
      
      if (isNaN(dataHora.getTime())) {
        throw new Error('Data inválida');
      }
    } catch (e) {
      normalizados.push({
        user_id_relogio: enNo,
        nome_detectado: reg.name || '',
        data_hora: null,
        data: null,
        hora: null,
        origem: 'relogio',
        metodo: reg.mode || '',
        dispositivo_id: reg.tmNo || '',
        raw_linha: (reg.raw || '').substring(0, 500),
        valido: false,
        motivo_invalido: `DateTime inválido: "${reg.dateTime}"`,
        funcionario_id: null
      });
      continue;
    }
    
    const data = dataHora.toISOString().split('T')[0];
    const hora = dataHora.toISOString().split('T')[1].split('.')[0];
    
    // Buscar funcionário por EnNo
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
      motivo_invalido: funcionario ? null : 'Funcionário não vinculado ao ID do relógio'
    });
  }
  
  return normalizados;
}

// === HANDLER PRINCIPAL ===
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file');
    const conteudoColado = formData.get('conteudo_colado');
    const nomeArquivo = formData.get('nome_arquivo') || 'arquivo';
    
    if (!file && !conteudoColado) {
      return Response.json({
        success: false,
        error: 'Nenhum arquivo ou conteúdo fornecido'
      }, { status: 400 });
    }
    
    // 1. Detectar e parsear
    let registros = [];
    let formato = 'desconhecido';
    
    if (conteudoColado) {
      // Conteúdo colado = TXT
      formato = 'txt';
      registros = parseTXT(conteudoColado);
    } else if (file) {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.txt')) {
        formato = 'txt';
        const texto = await file.text();
        registros = parseTXT(texto);
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        formato = 'xlsx';
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        registros = parseXLSX(buffer);
      } else {
        return Response.json({
          success: false,
          error: 'Formato não suportado. Use TXT ou XLSX.'
        }, { status: 400 });
      }
    }
    
    if (registros.length === 0) {
      return Response.json({
        success: false,
        error: 'Nenhum registro válido encontrado no arquivo'
      });
    }
    
    // 2. Buscar funcionários
    const funcionarios = await base44.asServiceRole.entities.Funcionario.list();
    
    // 3. Normalizar e vincular
    const normalizados = await normalizar(registros, funcionarios);
    
    // 4. Salvar TODOS os registros
    const salvos = [];
    for (const registro of normalizados) {
      try {
        const salvo = await base44.asServiceRole.entities.PontoRegistro.create(registro);
        salvos.push(salvo);
      } catch (e) {
        console.error('Erro ao salvar registro:', e);
      }
    }
    
    // 5. Criar registro de importação
    const datas = normalizados.filter(r => r.data).map(r => r.data).sort();
    const periodo_inicio = datas[0] || null;
    const periodo_fim = datas[datas.length - 1] || null;
    
    const validos = normalizados.filter(r => r.valido).length;
    const invalidos = normalizados.filter(r => !r.valido).length;
    
    const logErros = normalizados
      .filter(r => !r.valido)
      .slice(0, 50)
      .map(r => `${r.motivo_invalido} | EnNo: ${r.user_id_relogio}`)
      .join('\n');
    
    await base44.asServiceRole.entities.ImportacaoPonto.create({
      data_importacao: new Date().toISOString(),
      arquivo_nome: nomeArquivo,
      periodo_inicio,
      periodo_fim,
      total_linhas: registros.length,
      total_registros_validos: validos,
      total_ignorados: invalidos,
      status: 'concluida',
      log_erros: logErros || null
    });
    
    // 6. Retornar resumo
    return Response.json({
      success: true,
      message: `${salvos.length} registros importados com sucesso`,
      stats: {
        total_lidos: registros.length,
        total_salvos: salvos.length,
        total_validos: validos,
        total_invalidos: invalidos,
        periodo_inicio,
        periodo_fim,
        formato_detectado: formato
      },
      ids_sem_mapeamento: [...new Set(
        normalizados
          .filter(r => !r.funcionario_id && r.user_id_relogio && /^\d+$/.test(r.user_id_relogio))
          .map(r => r.user_id_relogio)
      )]
    });
    
  } catch (error) {
    console.error('Erro na importação:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao importar dados de ponto'
    }, { status: 500 });
  }
});