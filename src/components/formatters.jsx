export const formatCurrency = (value) => {
  const numValue = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // Ajuste para garantir que a data exibida seja a correta, independente do fuso horário do navegador
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const correctedDate = new Date(date.getTime() + userTimezoneOffset);

  if (isNaN(correctedDate)) return '-';
  
  const day = String(correctedDate.getDate()).padStart(2, '0');
  const month = String(correctedDate.getMonth() + 1).padStart(2, '0');
  const year = correctedDate.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatCompetencia = (competencia) => {
  if (!competencia) return '-';
  const [ano, mes] = competencia.split('-');
  if (!ano || !mes) return '-';
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
};