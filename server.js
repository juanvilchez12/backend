require("dotenv").config(); // Cargar variables de entorno
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/connectDB");
const authRoutes = require("./routes/authRoutes");
const statsRoutes = require("./routes/statsRoutes");
const alertRoutes = require("./routes/alertRoutes");
const { createServer } = require("http");
const { Server } = require("socket.io");
const upload = require("./middleware/upload"); // Middleware para subida de archivos

const app = express();
const httpServer = createServer(app);

// Configuración de CORS para permitir solicitudes desde diferentes orígenes
const corsOptions = {
  origin: "*", // Cambiar a tu dominio en producción (ej. 'https://mi-dominio.com')
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json()); // Habilitar JSON parsing para solicitudes

// Servir archivos estáticos (imágenes subidas)
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath)); // Habilitar acceso a imágenes subidas

// Conectar a MongoDB
connectDB();

// Configuración de WebSockets con CORS
const io = new Server(httpServer, {
  cors: corsOptions, // Usar las mismas configuraciones de CORS para WebSockets
});

// Rutas
app.use("/api/auth", authRoutes); // Rutas de autenticación
app.use("/api/stats", statsRoutes); // Rutas de estadísticas
app.use("/api/alerts", alertRoutes(io)); // Pasar `io` a las rutas de alertas para WebSockets

// Ruta para manejar la carga de archivos (imágenes u otros archivos)
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se ha subido ningún archivo." });
  }

  // Responder con la URL de la imagen subida para accederla desde el frontend
  res.status(200).json({
    message: "Archivo subido correctamente",
    fileUrl: `/uploads/${req.file.filename}`,
  });
});

// Manejo de conexiones WebSocket
io.on("connection", (socket) => {
  console.log(`🟢 Cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔴 Cliente desconectado: ${socket.id}`);
  });

  socket.on("error", (err) => {
    console.error("⚠️ Error en WebSocket:", err.message);
  });
});

// Ruta raíz para pruebas
app.get("/", (req, res) => {
  res.send("🚀 ¡Servidor HTTP y WebSocket funcionando!");
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ message: "Error interno del servidor", error: err.message });
});

// Iniciar servidor HTTP y WebSocket
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor HTTP corriendo en: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket disponible en: ws://localhost:${PORT}`);
});
