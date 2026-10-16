const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { badRequest, notFound } = require('./AppError');

// Los archivos subidos viven fuera de src/ y nunca se sirven de forma estática:
// cada descarga pasa por un endpoint que valida quién la pide.
const RAIZ = path.resolve(__dirname, '../../uploads');

const TIPOS_PERMITIDOS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
const TAMANO_MAXIMO = 5 * 1024 * 1024;

// subirArchivo('cartas') -> middleware multer que guarda en uploads/cartas/<aleatorio>.<ext>
function subirArchivo(carpeta, campo = 'archivo') {
  const destino = path.join(RAIZ, carpeta);
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(destino, { recursive: true });
      cb(null, destino);
    },
    filename: (req, file, cb) => {
      cb(null, crypto.randomUUID() + TIPOS_PERMITIDOS[file.mimetype]);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: TAMANO_MAXIMO, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!TIPOS_PERMITIDOS[file.mimetype]) {
        return cb(badRequest('Solo se aceptan archivos PDF, JPG o PNG'));
      }
      return cb(null, true);
    },
  }).single(campo);

  return (req, res, next) =>
    upload(req, res, (err) => {
      if (err) return next(err);
      if (!req.file) return next(badRequest('Adjunta un archivo PDF, JPG o PNG'));
      // ruta relativa a uploads/, con '/' para que sea igual en Windows y Linux
      req.file.rutaRelativa = `${carpeta}/${req.file.filename}`;
      // multer entrega el nombre en latin1; se recupera el UTF-8 original (acentos, ñ)
      req.file.nombreOriginal = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      return next();
    });
}

// Ruta absoluta segura a partir de la ruta relativa guardada en la BD
function rutaAbsoluta(rutaRelativa) {
  const abs = path.resolve(RAIZ, rutaRelativa || '');
  if (!rutaRelativa || !abs.startsWith(RAIZ + path.sep)) throw notFound('Archivo no encontrado');
  return abs;
}

function enviarArchivo(res, rutaRelativa, nombreDescarga) {
  const abs = rutaAbsoluta(rutaRelativa);
  if (!fs.existsSync(abs)) throw notFound('El archivo ya no existe en el servidor');
  if (nombreDescarga) {
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nombreDescarga)}"`);
  }
  return res.sendFile(abs);
}

function borrarArchivo(rutaRelativa) {
  try {
    fs.unlinkSync(rutaAbsoluta(rutaRelativa));
  } catch {
    // si no existe no pasa nada
  }
}

module.exports = { subirArchivo, enviarArchivo, borrarArchivo, TAMANO_MAXIMO };
