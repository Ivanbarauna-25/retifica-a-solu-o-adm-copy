// components/ponto/ValidadorPonto.jsx
export function validarDia({ batidas, escala }) {
  if (!escala) return { status: "SEM ESCALA" };

  const horasPrevistas = escala.horas_diarias || 8;

  let minutos = 0;
  for (let i = 0; i < batidas.length; i += 2) {
    if (batidas[i + 1]) {
      const [h1, m1] = batidas[i].split(":").map(Number);
      const [h2, m2] = batidas[i + 1].split(":").map(Number);
      minutos += (h2 * 60 + m2) - (h1 * 60 + m1);
    }
  }

  const horas = minutos / 60;
  const saldo = horas - horasPrevistas;

  return {
    status: saldo >= 0 ? "OK" : "DEVEDOR",
    saldo
  };
}