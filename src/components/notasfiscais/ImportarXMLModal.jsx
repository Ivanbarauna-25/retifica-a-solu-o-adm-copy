import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, AlertCircle, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatDate } from '@/components/formatters';

export default function ImportarXMLModal({ isOpen, onClose, fornecedores, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [notaData, setNotaData] = useState(null);
  const [itensData, setItensData] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xml')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione um arquivo XML válido.',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const nNF = xmlDoc.querySelector('nNF')?.textContent || '';
      const serie = xmlDoc.querySelector('serie')?.textContent || '';
      const dhEmi = xmlDoc.querySelector('dhEmi')?.textContent?.split('T')[0] || '';
      const chNFe = xmlDoc.querySelector('chNFe')?.textContent || '';
      const vNF = parseFloat(xmlDoc.querySelector('vNF')?.textContent || '0');
      const vProd = parseFloat(xmlDoc.querySelector('vProd')?.textContent || '0');
      const vICMS = parseFloat(xmlDoc.querySelector('vICMS')?.textContent || '0');
      const vIPI = parseFloat(xmlDoc.querySelector('vIPI')?.textContent || '0');
      const vFrete = parseFloat(xmlDoc.querySelector('vFrete')?.textContent || '0');
      const vSeg = parseFloat(xmlDoc.querySelector('vSeg')?.textContent || '0');
      const vDesc = parseFloat(xmlDoc.querySelector('vDesc')?.textContent || '0');
      const vOutro = parseFloat(xmlDoc.querySelector('vOutro')?.textContent || '0');
      
      const emit = xmlDoc.querySelector('emit');
      const fornecedorNome = emit?.querySelector('xNome')?.textContent || '';
      const fornecedorCnpj = emit?.querySelector('CNPJ')?.textContent || '';
      const fornecedorEmail = emit?.querySelector('email')?.textContent || '';
      const enderEmit = emit?.querySelector('enderEmit');
      const fornecedorEndereco = enderEmit ? 
        `${enderEmit.querySelector('xLgr')?.textContent || ''}, ${enderEmit.querySelector('nro')?.textContent || ''} - ${enderEmit.querySelector('xBairro')?.textContent || ''}, ${enderEmit.querySelector('xMun')?.textContent || ''} - ${enderEmit.querySelector('UF')?.textContent || ''}` : '';
      const fornecedorTelefone = emit?.querySelector('fone')?.textContent || '';

      const dupNodes = xmlDoc.querySelectorAll('dup');
      const duplicatas = [];
      dupNodes.forEach(dup => {
        const nDup = dup.querySelector('nDup')?.textContent || '';
        const dVenc = dup.querySelector('dVenc')?.textContent || '';
        const vDup = parseFloat(dup.querySelector('vDup')?.textContent || '0');
        
        if (nDup && vDup > 0) {
          duplicatas.push({
            numero: nDup,
            vencimento: dVenc,
            valor: vDup
          });
        }
      });

      setNotaData({
        numero_nota: nNF,
        serie: serie,
        data_emissao: dhEmi,
        data_entrada: new Date().toISOString().split('T')[0],
        chave_acesso: chNFe,
        valor_total: vNF,
        valor_produtos: vProd,
        valor_icms: vICMS,
        valor_ipi: vIPI,
        valor_frete: vFrete,
        valor_seguro: vSeg,
        valor_desconto: vDesc,
        valor_outras_despesas: vOutro,
        tipo_entrada: 'revenda',
        duplicatas: duplicatas,
        condicao_pagamento: duplicatas.length > 1 ? 'parcelado' : duplicatas.length === 1 ? 'a_vista' : null,
        numero_parcelas: duplicatas.length > 0 ? duplicatas.length : null,
        data_vencimento: duplicatas.length > 0 ? duplicatas[0].vencimento : null,
        fornecedorNome,
        fornecedorCnpj,
        fornecedorEmail,
        fornecedorEndereco,
        fornecedorTelefone,
        xml: text
      });

      const detNodes = xmlDoc.querySelectorAll('det');
      const itens = [];

      detNodes.forEach(det => {
        const prod = det.querySelector('prod');
        if (!prod) return;

        const cProd = prod.querySelector('cProd')?.textContent || '';
        const xProd = prod.querySelector('xProd')?.textContent || '';
        const NCM = prod.querySelector('NCM')?.textContent || '';
        const CFOP = prod.querySelector('CFOP')?.textContent || '';
        const uCom = prod.querySelector('uCom')?.textContent || '';
        const qCom = parseFloat(prod.querySelector('qCom')?.textContent || '0');
        const vUnCom = parseFloat(prod.querySelector('vUnCom')?.textContent || '0');
        const vProd = parseFloat(prod.querySelector('vProd')?.textContent || '0');
        const cEAN = prod.querySelector('cEAN')?.textContent || '';
        
        const imposto = det.querySelector('imposto');
        const icms = imposto?.querySelector('ICMS');
        const icmsElement = icms?.querySelector('ICMS00, ICMS10, ICMS20, ICMS30, ICMS40, ICMS51, ICMS60, ICMS70, ICMS90, ICMSSN101, ICMSSN102, ICMSSN201, ICMSSN202, ICMSSN500, ICMSSN900');
        
        const cst = icmsElement?.querySelector('CST')?.textContent || icmsElement?.querySelector('CSOSN')?.textContent || '';
        const orig = icmsElement?.querySelector('orig')?.textContent || '';
        const pICMS = parseFloat(icmsElement?.querySelector('pICMS')?.textContent || '0');
        const vICMS = parseFloat(icmsElement?.querySelector('vICMS')?.textContent || '0');
        
        const ipi = imposto?.querySelector('IPI');
        const ipiElement = ipi?.querySelector('IPITrib');
        const pIPI = parseFloat(ipiElement?.querySelector('pIPI')?.textContent || '0');
        const vIPI = parseFloat(ipiElement?.querySelector('vIPI')?.textContent || '0');

        itens.push({
          codigo_produto: cProd,
          descricao: xProd,
          ncm: NCM,
          cfop: CFOP,
          cst: cst,
          origem: orig,
          unidade: uCom,
          quantidade: qCom,
          valor_unitario: vUnCom,
          valor_total: vProd,
          ean: cEAN,
          tipo_entrada: 'revenda',
          aliquota_icms: pICMS,
          valor_icms: vICMS,
          aliquota_ipi: pIPI,
          valor_ipi: vIPI
        });
      });

      setItensData(itens);
      setStep(2);
    } catch (error) {
      console.error('Erro ao ler XML:', error);
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível processar o arquivo XML.',
        variant: 'destructive'
      });
    }
  };

  const handleEditItem = (index, field, value) => {
    const updated = [...itensData];
    updated[index][field] = value;
    
    if (field === 'quantidade' || field === 'valor_unitario') {
      updated[index].valor_total = updated[index].quantidade * updated[index].valor_unitario;
    }
    
    setItensData(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = itensData.filter((_, i) => i !== index);
    setItensData(updated);
  };

  const handleImport = async () => {
    if (!notaData || itensData.length === 0) {
      toast({
        title: 'Dados incompletos',
        description: 'Verifique os dados da nota e itens.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setStep(3);
    
    try {
      let fornecedorId;
      const fornecedoresExistentes = await base44.entities.Fornecedor.filter({ cnpj: notaData.fornecedorCnpj });

      if (fornecedoresExistentes && fornecedoresExistentes.length > 0) {
        fornecedorId = fornecedoresExistentes[0].id;
        toast({
          title: '✅ Fornecedor encontrado',
          description: `Usando fornecedor cadastrado: ${notaData.fornecedorNome}`
        });
      } else {
        const novoFornecedor = await base44.entities.Fornecedor.create({
          nome: notaData.fornecedorNome,
          cnpj: notaData.fornecedorCnpj,
          contato: notaData.fornecedorTelefone,
          email: notaData.fornecedorEmail,
          endereco: notaData.fornecedorEndereco,
          categoria: 'pecas',
          status: 'ativo'
        });
        fornecedorId = novoFornecedor.id;
        toast({
          title: '✅ Fornecedor cadastrado',
          description: `Novo fornecedor criado: ${notaData.fornecedorNome}`
        });
      }

      const notaCriada = await base44.entities.NotaFiscalEntrada.create({
        numero_nota: notaData.numero_nota,
        serie: notaData.serie,
        fornecedor_id: fornecedorId,
        data_emissao: notaData.data_emissao,
        data_entrada: notaData.data_entrada,
        chave_acesso: notaData.chave_acesso,
        tipo_entrada: notaData.tipo_entrada,
        valor_total: notaData.valor_total,
        valor_produtos: notaData.valor_produtos,
        valor_icms: notaData.valor_icms,
        valor_ipi: notaData.valor_ipi,
        valor_frete: notaData.valor_frete,
        valor_seguro: notaData.valor_seguro,
        valor_desconto: notaData.valor_desconto,
        valor_outras_despesas: notaData.valor_outras_despesas,
        duplicatas: notaData.duplicatas,
        condicao_pagamento: notaData.condicao_pagamento,
        numero_parcelas: notaData.numero_parcelas,
        data_vencimento: notaData.data_vencimento,
        status: 'pendente',
        xml_nfe: notaData.xml
      });

      for (const item of itensData) {
        await base44.entities.ItemNotaFiscal.create({
          nota_fiscal_id: notaCriada.id,
          ...item,
          processado: false
        });
      }

      const duplicatasMsg = notaData.duplicatas && notaData.duplicatas.length > 0 
        ? ` com ${notaData.duplicatas.length} duplicata(s)` 
        : '';

      toast({
        title: '✅ XML importado com sucesso!',
        description: `Nota fiscal ${notaData.numero_nota} criada com ${itensData.length} itens${duplicatasMsg}.`
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao importar XML:', error);
      toast({
        title: 'Erro ao importar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setNotaData(null);
    setItensData([]);
    setFile(null);
  };

  return (
    <>
      <style>{`
        .importar-xml-scroll {
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
        }
        
        @media (min-width: 768px) {
          .importar-xml-scroll::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }
          .importar-xml-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 8px;
            margin: 4px;
          }
          .importar-xml-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 8px;
            border: 3px solid #f1f5f9;
          }
          .importar-xml-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
          .importar-xml-scroll {
            scrollbar-width: thin;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
        }
        
        @media (max-width: 767px) {
          .importar-xml-scroll {
            scrollbar-width: auto;
            scrollbar-color: #94a3b8 #f1f5f9;
          }
          .importar-xml-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .importar-xml-scroll::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
          }
          .importar-xml-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.8);
            border-radius: 4px;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-6xl h-[95vh] md:max-h-[95vh] overflow-hidden modern-modal bg-white flex flex-col p-0">
          <DialogHeader className="modern-modal-header flex-shrink-0 bg-slate-800 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-3 text-white">
              <Upload className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-base md:text-lg">
                {step === 1 && 'Importar XML de NF-e'}
                {step === 2 && 'Revisar e Editar Dados'}
                {step === 3 && 'Processando Importação...'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="importar-xml-scroll flex-1 px-3 md:px-6 pb-3 md:pb-6 space-y-3 md:space-y-6 mt-3 md:mt-6">
            {step === 1 && (
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="w-4 h-4 text-black" />
                  <AlertDescription className="text-black">
                    Faça upload do arquivo XML da NF-e. Os dados serão extraídos e você poderá revisar antes de importar.
                    <strong> Se o fornecedor não existir, será cadastrado automaticamente!</strong>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label className="text-sm font-medium text-black">Arquivo XML *</Label>
                  <Input
                    type="file"
                    accept=".xml"
                    onChange={handleFileChange}
                    className="mt-1.5 bg-white text-black"
                  />
                </div>
              </>
            )}

            {step === 2 && notaData && (
              <>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 md:p-5">
                    <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-black">Dados da Nota Fiscal</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      <div>
                        <Label className="text-xs text-black">Número</Label>
                        <Input value={notaData.numero_nota} readOnly className="bg-white text-black" />
                      </div>
                      <div>
                        <Label className="text-xs text-black">Série</Label>
                        <Input value={notaData.serie} readOnly className="bg-white text-black" />
                      </div>
                      <div>
                        <Label className="text-xs text-black">Data Emissão</Label>
                        <Input type="date" value={notaData.data_emissao} onChange={(e) => setNotaData({...notaData, data_emissao: e.target.value})} className="bg-white text-black" />
                      </div>
                      <div>
                        <Label className="text-xs text-black">Data Entrada</Label>
                        <Input type="date" value={notaData.data_entrada} onChange={(e) => setNotaData({...notaData, data_entrada: e.target.value})} className="bg-white text-black" />
                      </div>
                      <div>
                        <Label className="text-xs text-black">Tipo Entrada</Label>
                        <Select value={notaData.tipo_entrada} onValueChange={(v) => setNotaData({...notaData, tipo_entrada: v})}>
                          <SelectTrigger className="bg-white text-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="consumo">Consumo</SelectItem>
                            <SelectItem value="revenda">Revenda</SelectItem>
                            <SelectItem value="remessa">Remessa</SelectItem>
                            <SelectItem value="uso_consumo">Uso e Consumo</SelectItem>
                            <SelectItem value="ativo_imobilizado">Ativo Imobilizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-black">Valor Total</Label>
                        <Input value={formatCurrency(notaData.valor_total)} readOnly className="bg-white text-black font-bold" />
                      </div>
                    </div>
                    
                    <div className="mt-3 md:mt-4 p-3 bg-white rounded border border-blue-200">
                      <p className="text-sm font-semibold text-black">Fornecedor: {notaData.fornecedorNome}</p>
                      <p className="text-xs text-black">CNPJ: {notaData.fornecedorCnpj}</p>
                      {!fornecedores.find(f => f.cnpj === notaData.fornecedorCnpj) && (
                        <div className="mt-2 flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-xs font-medium">Será cadastrado automaticamente</span>
                        </div>
                      )}
                    </div>

                    {notaData.duplicatas && notaData.duplicatas.length > 0 && (
                      <div className="mt-3 md:mt-4 p-3 bg-green-50 rounded border border-green-200">
                        <h4 className="font-semibold text-sm text-black mb-2">
                          📄 Duplicatas Encontradas ({notaData.duplicatas.length})
                        </h4>
                        <div className="space-y-1">
                          {notaData.duplicatas.map((dup, idx) => (
                            <div key={idx} className="text-xs text-black flex justify-between">
                              <span>Nº {dup.numero} - Venc: {formatDate(dup.vencimento)}</span>
                              <span className="font-semibold">{formatCurrency(dup.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200">
                  <CardContent className="p-4 md:p-5">
                    <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-black">Itens da Nota ({itensData.length})</h3>
                    <div className="overflow-x-auto -webkit-overflow-scrolling: touch;">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-800">
                            <TableHead className="text-white text-xs md:text-sm">Código</TableHead>
                            <TableHead className="text-white text-xs md:text-sm">Descrição</TableHead>
                            <TableHead className="text-white text-xs md:text-sm">NCM</TableHead>
                            <TableHead className="text-white text-xs md:text-sm">Qtd</TableHead>
                            <TableHead className="text-white text-xs md:text-sm">Valor Un.</TableHead>
                            <TableHead className="text-white text-xs md:text-sm">Total</TableHead>
                            <TableHead className="text-white text-xs md:text-sm">Tipo</TableHead>
                            <TableHead className="text-center text-white text-xs md:text-sm">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itensData.map((item, idx) => (
                            <TableRow key={idx} className="bg-white hover:bg-slate-50">
                              <TableCell>
                                {editingIndex === idx ? (
                                  <Input
                                    value={item.codigo_produto}
                                    onChange={(e) => handleEditItem(idx, 'codigo_produto', e.target.value)}
                                    className="w-28 bg-white text-black"
                                  />
                                ) : (
                                  <span className="font-mono text-xs text-black">{item.codigo_produto}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingIndex === idx ? (
                                  <Input
                                    value={item.descricao}
                                    onChange={(e) => handleEditItem(idx, 'descricao', e.target.value)}
                                    className="bg-white text-black"
                                  />
                                ) : (
                                  <span className="text-xs md:text-sm text-black">{item.descricao}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-black">{item.ncm}</span>
                              </TableCell>
                              <TableCell>
                                {editingIndex === idx ? (
                                  <Input
                                    type="number"
                                    value={item.quantidade}
                                    onChange={(e) => handleEditItem(idx, 'quantidade', parseFloat(e.target.value))}
                                    className="w-20 bg-white text-black"
                                  />
                                ) : (
                                  <span className="text-black">{item.quantidade}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingIndex === idx ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.valor_unitario}
                                    onChange={(e) => handleEditItem(idx, 'valor_unitario', parseFloat(e.target.value))}
                                    className="w-24 bg-white text-black"
                                  />
                                ) : (
                                  <span className="text-black">{formatCurrency(item.valor_unitario)}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold text-black">
                                {formatCurrency(item.valor_total)}
                              </TableCell>
                              <TableCell>
                                {editingIndex === idx ? (
                                  <Select value={item.tipo_entrada} onValueChange={(v) => handleEditItem(idx, 'tipo_entrada', v)}>
                                    <SelectTrigger className="w-32 bg-white text-black">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                      <SelectItem value="consumo">Consumo</SelectItem>
                                      <SelectItem value="revenda">Revenda</SelectItem>
                                      <SelectItem value="remessa">Remessa</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs text-black">{item.tipo_entrada}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {editingIndex === idx ? (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => setEditingIndex(null)}
                                      className="bg-slate-600 hover:bg-slate-700 text-white h-8 px-2"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => setEditingIndex(idx)}
                                      className="bg-slate-600 hover:bg-slate-700 text-white h-8 px-2"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleRemoveItem(idx)}
                                    className="bg-slate-600 hover:bg-slate-700 text-white h-8 px-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {step === 3 && (
              <div className="text-center py-12">
                <Loader2 className="h-16 w-16 animate-spin text-slate-600 mx-auto" />
                <p className="mt-4 text-lg font-semibold text-black">Processando importação...</p>
                <p className="text-sm text-black">Cadastrando nota fiscal e itens...</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-between gap-2 md:gap-3 px-3 md:px-6 py-3 md:py-4 border-t bg-white">
            {step === 2 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleBack} 
                  disabled={isProcessing}
                  className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10 w-full sm:w-auto text-sm"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={isProcessing} 
                  className="bg-slate-600 hover:bg-slate-700 text-white gap-2 h-10"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Confirmar Importação
                    </>
                  )}
                </Button>
              </>
            )}
            {step === 1 && (
              <Button 
                variant="outline" 
                onClick={onClose}
                className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 h-10 w-full sm:w-auto text-sm"
              >
                Cancelar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}