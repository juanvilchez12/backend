const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/connectDB");
const authRoutes = require("./routes/authRoutes");
const statsRoutes = require("./routes/statsRoutes");
const alertRoutes = require("./routes/alertRoutes");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Permitir cualquier origen, modifica según sea necesario
    methods: ["GET", "POST"],
  },
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Conexión a MongoDB
connectDB();

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/alerts", alertRoutes(io)); // Asegúrate de que alertRoutes está correctamente configurada

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ message: "Error interno del servidor", error: err.message });
});

// Socket.IO para tiempo real
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Ejemplo de un evento personalizado
  socket.on("custom-event", (data) => {
    console.log(`Evento recibido del cliente ${socket.id}:`, data);
    socket.emit("server-response", { message: "Evento recibido correctamente." });
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Inicio del Servidor
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log(`WebSocket disponible en ws://localhost:${PORT}`);
});
