import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * GERAR PREVIEW DE IMPORTAÇÃO (NÃO SALVA)
 * Retorna registros normalizados para revisão
 */

// === PARSER TXT (AttendLog TSV) - DINÂMICO ===
function parseTXT(conteudo) {
  const linhas = conteudo.split('\n');
  const registros = [];
  let headerMap = null;

  for (const linha of linhas) {
    const limpa = linha.replace(/\r/g, '').trim();
    
    if (!limpa) continue;
    if (limpa.startsWith('#')) continue;
    
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

// === NORMALIZAR ===
async function normalizar(registros, funcionarios) {
  const normalizados = [];
  
  for (const reg of registros) {
    const enNo = String(reg.enNo || '').trim();
    
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
    
    let dataHora;
    try {
      const dt = String(reg.dateTime || '').trim();
      if (!dt) throw new Error('DateTime vazio');
      
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
      motivo_invalido: funcionario ? null : 'EnNo sem funcionário vinculado'
    });
  }
  
  return normalizados;
}

// === HANDLER ===
Deno.serve(async (req) => {
  console.log('🚀 Function iniciada');
  
  try {
    console.log('1️⃣ Criando cliente...');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('❌ Não autorizado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('2️⃣ Lendo body...');
    const body = await req.json();
    const { conteudo_colado, file_data, nome_arquivo } = body;
    
    console.log('📥 Payload recebido:', { 
      tem_conteudo: !!conteudo_colado, 
      tam_conteudo: conteudo_colado?.length,
      tem_file: !!file_data,
      nome_arquivo 
    });
    
    if (!conteudo_colado && !file_data) {
      console.log('❌ Sem dados');
      return Response.json({
        success: false,
        error: 'Nenhum arquivo ou conteúdo fornecido'
      }, { status: 400 });
    }
    
    console.log('3️⃣ Parseando...');
    let registros = [];
    let formato = 'desconhecido';
    
    if (conteudo_colado) {
      console.log('📝 Processando conteúdo colado...', conteudo_colado.substring(0, 100));
      formato = 'txt';
      registros = parseTXT(conteudo_colado);
      console.log('✅ Parseado:', registros.length, 'registros');
    } else if (file_data) {
      console.log('📄 Processando arquivo...');
      const fileName = (nome_arquivo || '').toLowerCase();
      
      if (fileName.endsWith('.txt')) {
        formato = 'txt';
        registros = parseTXT(file_data);
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        formato = 'xlsx';
        const buffer = new TextEncoder().encode(file_data);
        registros = parseXLSX(buffer);
      } else {
        return Response.json({
          success: false,
          error: 'Formato não suportado. Use TXT ou XLSX.'
        }, { status: 400 });
      }
    }
    
    if (registros.length === 0) {
      console.log('⚠️ Nenhum registro encontrado');
      return Response.json({
        success: false,
        error: 'Nenhum registro encontrado no arquivo'
      });
    }
    
    console.log('4️⃣ Buscando funcionários...');
    const funcionarios = await base44.asServiceRole.entities.Funcionario.list();
    console.log('✅ Encontrados:', funcionarios.length, 'funcionários');
    
    console.log('5️⃣ Normalizando...');
    const normalizados = await normalizar(registros, funcionarios);
    console.log('✅ Normalizado:', normalizados.length, 'registros');
    
    const datas = normalizados.filter(r => r.data).map(r => r.data).sort();
    
    console.log('6️⃣ Retornando resposta...');
    return Response.json({
      success: true,
      registros: normalizados,
      stats: {
        total: normalizados.length,
        validos: normalizados.filter(r => r.valido).length,
        invalidos: normalizados.filter(r => !r.valido).length,
        periodo_inicio: datas[0] || null,
        periodo_fim: datas[datas.length - 1] || null,
        formato
      }
    });
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao processar arquivo',
      details: error.stack
    }, { status: 500 });
  }
});