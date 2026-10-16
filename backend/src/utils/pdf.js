const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const INSTITUCION = process.env.INSTITUCION_NOMBRE || 'Universidad Autónoma de Chiapas';
const AZUL = rgb(0.043, 0.227, 0.388); // #0b3a63, el mismo del login

// Las fuentes estándar de pdf-lib usan WinAnsi: quita lo que no se pueda dibujar.
const limpiar = (t) => String(t ?? '').replace(/[^\x20-\x7E -ÿ\n]/g, '');

function partirLineas(texto, fuente, tamano, ancho) {
  const lineas = [];
  for (const parrafo of limpiar(texto).split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tamano) > ancho && linea) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = prueba;
      }
    }
    lineas.push(linea);
  }
  return lineas;
}

// Arma una carta tamaño carta: encabezado institucional, fecha, destinatario,
// párrafos y bloque de firma. Devuelve un Buffer.
async function generarCarta({ titulo, folio, fecha, destinatario, parrafos, firma, piePagina }) {
  const doc = await PDFDocument.create();
  doc.setTitle(limpiar(titulo));
  const page = doc.addPage([612, 792]);
  const normal = await doc.embedFont(StandardFonts.TimesRoman);
  const negrita = await doc.embedFont(StandardFonts.TimesRomanBold);
  const margen = 72;
  const ancho = 612 - margen * 2;
  let y = 792 - margen;

  const escribir = (texto, { fuente = normal, tamano = 12, color = rgb(0, 0, 0), x = margen, alto = 16 } = {}) => {
    page.drawText(limpiar(texto), { x, y, size: tamano, font: fuente, color });
    y -= alto;
  };

  escribir(INSTITUCION, { fuente: negrita, tamano: 15, color: AZUL, alto: 18 });
  escribir('Sistema de Gestión de Prácticas Profesionales (SIGEA)', { tamano: 10, color: AZUL, alto: 10 });
  page.drawLine({ start: { x: margen, y }, end: { x: 612 - margen, y }, thickness: 1.5, color: AZUL });
  y -= 30;

  const derecha = (texto) => {
    const t = limpiar(texto);
    page.drawText(t, { x: 612 - margen - normal.widthOfTextAtSize(t, 11), y, size: 11, font: normal });
    y -= 15;
  };
  if (folio) derecha(`Folio: ${folio}`);
  derecha(fecha);
  y -= 15;

  escribir(titulo.toUpperCase(), { fuente: negrita, tamano: 13, alto: 30 });
  for (const linea of destinatario) escribir(linea, { fuente: negrita, alto: 15 });
  y -= 15;

  for (const parrafo of parrafos) {
    for (const linea of partirLineas(parrafo, normal, 12, ancho)) escribir(linea, { alto: 17 });
    y -= 10;
  }

  y -= 50;
  const centro = (texto, fuente = normal) => {
    const t = limpiar(texto);
    page.drawText(t, { x: (612 - fuente.widthOfTextAtSize(t, 12)) / 2, y, size: 12, font: fuente });
    y -= 16;
  };
  page.drawLine({ start: { x: 206, y: y + 16 }, end: { x: 406, y: y + 16 }, thickness: 0.8 });
  for (const [i, linea] of firma.entries()) centro(linea, i === 0 ? negrita : normal);

  if (piePagina) {
    page.drawText(limpiar(piePagina), { x: margen, y: 40, size: 8, font: normal, color: rgb(0.4, 0.4, 0.4) });
  }

  return Buffer.from(await doc.save());
}

function fechaLarga(fecha = new Date()) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City',
  });
}

module.exports = { generarCarta, fechaLarga, INSTITUCION };
