import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Função auxiliar para extrair valores do XML usando regex
function extrairValorXML(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

// Função auxiliar para extrair todos os valores de uma tag
function extrairValoresXML(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

// Função auxiliar para extrair blocos XML
function extrairBlocosXML(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const blocos = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    blocos.push(match[1]);
  }
  return blocos;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { files } = await req.json();
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ 
        error: 'Nenhum arquivo foi enviado' 
      }, { status: 400 });
    }

    if (files.length > 50) {
      return Response.json({ 
        error: 'Limite de 50 arquivos por importação excedido' 
      }, { status: 400 });
    }

    const resultados = [];

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const fileName = fileData.name || `arquivo_${i + 1}.xml`;
      
      try {
        const xmlContent = fileData.content;

        // Verificar se a nota está cancelada (verificando o cStat do protocolo)
        const protNFeBloco = extrairBlocosXML(xmlContent, 'protNFe')[0] || '';
        const infProtBloco = extrairBlocosXML(protNFeBloco, 'infProt')[0] || '';
        const cStat = extrairValorXML(infProtBloco, 'cStat');
        
        // cStat 101 = nota cancelada, 100 = autorizada
        const notaCancelada = cStat === '101';

        // Extrair dados da nota fiscal
        const nNF = extrairValorXML(xmlContent, 'nNF');
        const serie = extrairValorXML(xmlContent, 'serie');
        const dhEmiRaw = extrairValorXML(xmlContent, 'dhEmi');
        const dhEmi = dhEmiRaw.split('T')[0] || '';
        const chNFe = extrairValorXML(xmlContent, 'chNFe');
        
        const vNF = parseFloat(extrairValorXML(xmlContent, 'vNF') || '0');
        const vProdMatches = extrairValoresXML(xmlContent, 'vProd');
        const vProdTotal = vProdMatches.length > 0 ? parseFloat(vProdMatches[0] || '0') : 0;
        const vICMSMatches = extrairValoresXML(xmlContent, 'vICMS');
        const vICMSTotal = vICMSMatches.length > 0 ? parseFloat(vICMSMatches[0] || '0') : 0;
        const vIPIMatches = extrairValoresXML(xmlContent, 'vIPI');
        const vIPITotal = vIPIMatches.length > 0 ? parseFloat(vIPIMatches[0] || '0') : 0;
        const vFrete = parseFloat(extrairValorXML(xmlContent, 'vFrete') || '0');
        const vSeg = parseFloat(extrairValorXML(xmlContent, 'vSeg') || '0');
        const vDesc = parseFloat(extrairValorXML(xmlContent, 'vDesc') || '0');
        const vOutro = parseFloat(extrairValorXML(xmlContent, 'vOutro') || '0');

        // Extrair dados do fornecedor (dentro da tag emit)
        const emitBloco = extrairBlocosXML(xmlContent, 'emit')[0] || '';
        const fornecedorNome = extrairValorXML(emitBloco, 'xNome');
        const fornecedorCnpj = extrairValorXML(emitBloco, 'CNPJ');
        const fornecedorEmail = extrairValorXML(emitBloco, 'email');
        const fornecedorTelefone = extrairValorXML(emitBloco, 'fone');
        
        const enderEmitBloco = extrairBlocosXML(emitBloco, 'enderEmit')[0] || '';
        const rua = extrairValorXML(enderEmitBloco, 'xLgr');
        const num = extrairValorXML(enderEmitBloco, 'nro');
        const bairro = extrairValorXML(enderEmitBloco, 'xBairro');
        const mun = extrairValorXML(enderEmitBloco, 'xMun');
        const uf = extrairValorXML(enderEmitBloco, 'UF');
        const fornecedorEndereco = `${rua}, ${num} - ${bairro}, ${mun} - ${uf}`;

        if (!nNF || !fornecedorCnpj) {
          resultados.push({
            arquivo: fileName,
            sucesso: false,
            erro: 'Dados obrigatórios faltando (número da nota ou CNPJ do fornecedor)'
          });
          continue;
        }

        const notasExistentes = await base44.asServiceRole.entities.NotaFiscalEntrada.filter({ 
          chave_acesso: chNFe 
        });
        
        if (notasExistentes && notasExistentes.length > 0) {
          resultados.push({
            arquivo: fileName,
            sucesso: false,
            erro: `Nota fiscal ${nNF} já foi importada anteriormente`
          });
          continue;
        }

        let fornecedorId;
        const fornecedoresExistentes = await base44.asServiceRole.entities.Fornecedor.filter({ 
          cnpj: fornecedorCnpj 
        });

        if (fornecedoresExistentes && fornecedoresExistentes.length > 0) {
          fornecedorId = fornecedoresExistentes[0].id;
        } else {
          const novoFornecedor = await base44.asServiceRole.entities.Fornecedor.create({
            nome: fornecedorNome,
            cnpj: fornecedorCnpj,
            contato: fornecedorTelefone,
            email: fornecedorEmail,
            endereco: fornecedorEndereco,
            categoria: 'pecas',
            status: 'ativo'
          });
          fornecedorId = novoFornecedor.id;
        }

        // Extrair duplicatas
        const duplicatas = [];
        const dupBlocos = extrairBlocosXML(xmlContent, 'dup');
        for (const dupBloco of dupBlocos) {
          const nDup = extrairValorXML(dupBloco, 'nDup');
          const dVenc = extrairValorXML(dupBloco, 'dVenc');
          const vDup = parseFloat(extrairValorXML(dupBloco, 'vDup') || '0');
          
          if (nDup && vDup > 0) {
            duplicatas.push({
              numero: nDup,
              vencimento: dVenc,
              valor: vDup
            });
          }
        }

        const notaCriada = await base44.asServiceRole.entities.NotaFiscalEntrada.create({
          numero_nota: nNF,
          serie: serie,
          fornecedor_id: fornecedorId,
          data_emissao: dhEmi,
          data_entrada: new Date().toISOString().split('T')[0],
          chave_acesso: chNFe,
          tipo_entrada: 'revenda',
          valor_total: vNF,
          valor_produtos: vProdTotal,
          valor_icms: vICMSTotal,
          valor_ipi: vIPITotal,
          valor_frete: vFrete,
          valor_seguro: vSeg,
          valor_desconto: vDesc,
          valor_outras_despesas: vOutro,
          duplicatas: duplicatas,
          condicao_pagamento: duplicatas.length > 1 ? 'parcelado' : duplicatas.length === 1 ? 'a_vista' : null,
          numero_parcelas: duplicatas.length > 0 ? duplicatas.length : null,
          data_vencimento: duplicatas.length > 0 ? duplicatas[0].vencimento : null,
          status: notaCancelada ? 'cancelada' : 'pendente',
          xml_nfe: fileData.content
        });

        // Extrair e criar itens
        const itensParaCriar = [];
        const detBlocos = extrairBlocosXML(xmlContent, 'det');

        for (const detBloco of detBlocos) {
          const prodBloco = extrairBlocosXML(detBloco, 'prod')[0] || '';
          
          const cProd = extrairValorXML(prodBloco, 'cProd');
          const xProd = extrairValorXML(prodBloco, 'xProd');
          const NCM = extrairValorXML(prodBloco, 'NCM');
          const CFOP = extrairValorXML(prodBloco, 'CFOP');
          const uCom = extrairValorXML(prodBloco, 'uCom');
          const qCom = parseFloat(extrairValorXML(prodBloco, 'qCom') || '0');
          const vUnCom = parseFloat(extrairValorXML(prodBloco, 'vUnCom') || '0');
          const vProdItem = parseFloat(extrairValorXML(prodBloco, 'vProd') || '0');
          const cEAN = extrairValorXML(prodBloco, 'cEAN');
          
          // Extrair dados de imposto
          const impostoBloco = extrairBlocosXML(detBloco, 'imposto')[0] || '';
          const icmsBloco = extrairBlocosXML(impostoBloco, 'ICMS')[0] || '';
          
          let cst = '';
          let orig = '';
          let pICMS = 0;
          let vICMSItem = 0;
          
          const icmsTags = ['ICMS00', 'ICMS10', 'ICMS20', 'ICMS30', 'ICMS40', 'ICMS51', 'ICMS60', 'ICMS70', 'ICMS90', 'ICMSSN101', 'ICMSSN102', 'ICMSSN201', 'ICMSSN202', 'ICMSSN500', 'ICMSSN900'];
          
          for (const tag of icmsTags) {
            const icmsDataBloco = extrairBlocosXML(icmsBloco, tag)[0];
            if (icmsDataBloco) {
              cst = extrairValorXML(icmsDataBloco, 'CST') || extrairValorXML(icmsDataBloco, 'CSOSN') || '';
              orig = extrairValorXML(icmsDataBloco, 'orig') || '';
              pICMS = parseFloat(extrairValorXML(icmsDataBloco, 'pICMS') || '0');
              vICMSItem = parseFloat(extrairValorXML(icmsDataBloco, 'vICMS') || '0');
              break;
            }
          }
          
          const ipiBloco = extrairBlocosXML(impostoBloco, 'IPI')[0] || '';
          const ipiTribBloco = extrairBlocosXML(ipiBloco, 'IPITrib')[0] || '';
          const pIPI = parseFloat(extrairValorXML(ipiTribBloco, 'pIPI') || '0');
          const vIPIItem = parseFloat(extrairValorXML(ipiTribBloco, 'vIPI') || '0');

          itensParaCriar.push({
            nota_fiscal_id: notaCriada.id,
            codigo_produto: cProd,
            descricao: xProd,
            ncm: NCM,
            cfop: CFOP,
            cst: cst,
            origem: orig,
            unidade: uCom,
            quantidade: qCom,
            valor_unitario: vUnCom,
            valor_total: vProdItem,
            ean: cEAN,
            tipo_entrada: 'revenda',
            aliquota_icms: pICMS,
            valor_icms: vICMSItem,
            aliquota_ipi: pIPI,
            valor_ipi: vIPIItem,
            processado: false
          });
        }

        if (itensParaCriar.length > 0) {
          await base44.asServiceRole.entities.ItemNotaFiscal.bulkCreate(itensParaCriar);
        }

        resultados.push({
          arquivo: fileName,
          sucesso: true,
          numeroNota: nNF,
          fornecedor: fornecedorNome,
          itens: itensParaCriar.length,
          duplicatas: duplicatas.length,
          cancelada: notaCancelada
        });

      } catch (erro) {
        console.error(`Erro ao processar ${fileName}:`, erro);
        resultados.push({
          arquivo: fileName,
          sucesso: false,
          erro: erro.message || 'Erro desconhecido ao processar arquivo'
        });
      }
    }

    const sucesso = resultados.filter(r => r.sucesso).length;
    const falha = resultados.filter(r => !r.sucesso).length;

    return Response.json({
      total: files.length,
      sucesso,
      falha,
      resultados
    });

  } catch (error) {
    console.error('Erro geral na importação em lote:', error);
    return Response.json({ 
      error: error.message || 'Erro ao processar importação em lote' 
    }, { status: 500 });
  }
});