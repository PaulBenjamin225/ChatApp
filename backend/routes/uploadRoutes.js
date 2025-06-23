// chat-backend/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multerConfig = require('../middleware/multerConfig');

// Route POST pour uploader un fichier
router.post('/', protect, multerConfig, (req, res) => {
  // Si multer a réussi, le fichier est disponible dans req.file
  if (!req.file) {
    return res.status(400).json({ message: 'Veuillez sélectionner un fichier.' });
  }

  // Construire l'URL du fichier accessible publiquement
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  // Renvoyer l'URL au frontend
  res.status(200).json({ fileUrl: fileUrl, fileType: req.file.mimetype });
});

module.exports = router;