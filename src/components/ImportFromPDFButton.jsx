import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadFile } from '@/integrations/Core';
import { ExtractDataFromUploadedFile } from '@/integrations/Core';
import { UploadCloud, Loader2 } from 'lucide-react';

export default function ImportFromPDFButton({ entity, onImportComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);

    try {
      // 1. Upload do arquivo
      const { file_url } = await UploadFile({ file });
      if (!file_url) throw new Error("Falha no upload do arquivo.");

      // 2. Extração dos dados
      const schemaToExtract = entity.schema();
      
      // Remover propriedades somente-leitura do schema para extração
      delete schemaToExtract.properties.id;
      delete schemaToExtract.properties.created_date;
      delete schemaToExtract.properties.updated_date;
      delete schemaToExtract.properties.created_by;
      
      const extractionResult = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: schemaToExtract,
            },
          },
        },
      });

      if (extractionResult.status !== 'success' || !extractionResult.output.items || extractionResult.output.items.length === 0) {
        throw new Error(extractionResult.details || "Nenhum dado válido foi extraído do PDF.");
      }

      // 3. Cadastro em massa dos dados extraídos
      await entity.bulkCreate(extractionResult.output.items);

      alert(`${extractionResult.output.items.length} registro(s) importado(s) com sucesso!`);
      onImportComplete();

    } catch (error) {
      console.error("Erro na importação:", error);
      alert(`Ocorreu um erro: ${error.message}`);
    } finally {
      setIsLoading(false);
      // Resetar o input para permitir o mesmo arquivo de novo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="application/pdf"
        disabled={isLoading}
      />
      <Button onClick={handleClick} variant="outline" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Importando...' : 'Importar de PDF'}
      </Button>
    </>
  );
}