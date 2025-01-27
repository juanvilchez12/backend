const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Asegurarte de que la carpeta 'uploads' exista
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes en formato JPG, JPEG o PNG."));
  }
};

const limits = {
  fileSize: 2 * 1024 * 1024, // Tamaño máximo de archivo: 2MB
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = upload;
