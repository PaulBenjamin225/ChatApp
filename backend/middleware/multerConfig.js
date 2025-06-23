// chat-backend/middleware/multerConfig.js

const multer = require('multer');
const path = require('path');

// Définir les types de fichiers acceptés
const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf'
};

const storage = multer.diskStorage({
  // Indiquer à multer où enregistrer les fichiers
  destination: (req, file, callback) => {
    callback(null, 'uploads/');
  },
  // Indiquer à multer comment nommer les fichiers pour éviter les doublons
  filename: (req, file, callback) => {
    const originalName = file.originalname.split(' ').join('_');
    const nameWithoutExt = path.parse(originalName).name;
    const extension = MIME_TYPES[file.mimetype];
    // Créer un nom de fichier unique : nom_original + timestamp + extension
    callback(null, nameWithoutExt + '_' + Date.now() + '.' + extension);
  }
});

// Filtre pour n'accepter que certains types de fichiers
const fileFilter = (req, file, callback) => {
  if (MIME_TYPES[file.mimetype]) {
    callback(null, true);
  } else {
    callback(new Error('Type de fichier non supporté !'), false);
  }
};

module.exports = multer({ storage: storage, fileFilter: fileFilter }).single('file');