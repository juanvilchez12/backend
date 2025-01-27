const express = require("express");
const Alert = require("../models/Alert");
const CompletedAlert = require("../models/CompletedAlert"); // Nuevo modelo para alertas completadas
const User = require("../models/User");

const router = express.Router();

module.exports = (io) => {
  // Función para mover alerta al historial
  const moveAlertToHistory = async (alert, userInfo) => {
    const completedAlert = new CompletedAlert({
      userId: alert.userId,
      lat: alert.lat,
      lng: alert.lng,
      userInfo,
      completedAt: new Date(),
    });

    await completedAlert.save(); // Guardar en la colección de alertas completadas
    await Alert.findByIdAndDelete(alert._id); // Eliminar de alertas activas
  };

  // Ruta de prueba para verificar si las rutas están funcionando
  router.get("/test", (req, res) => {
    console.log("Solicitud GET /api/alerts/test recibida");
    res.json({ message: "La ruta de alertas está funcionando correctamente." });
  });

  // Ruta para obtener todas las alertas activas
  router.get("/", async (req, res) => {
    try {
      const alerts = await Alert.find();
      res.status(200).json(alerts);
    } catch (error) {
      console.error("Error al obtener las alertas:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Ruta para obtener alertas completadas con filtros
  router.get("/completed", async (req, res) => {
    try {
      const { day, month, year } = req.query;

      let filter = {};
      if (day || month || year) {
        const startDate = new Date(
          year || 1970,
          month ? month - 1 : 0,
          day || 1
        );
        const endDate = new Date(
          year || 9999,
          month ? month - 1 : 11,
          day || new Date(year || 9999, month ? month : 12, 0).getDate()
        );
        filter.completedAt = { $gte: startDate, $lte: endDate };
      }

      const completedAlerts = await CompletedAlert.find(filter);
      res.status(200).json(completedAlerts);
    } catch (error) {
      console.error("Error al obtener las alertas completadas:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Ruta para obtener alertas específicas de un usuario
  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { day, month, year } = req.query;

    try {
      let filter = { userId };
      if (day || month || year) {
        const startDate = new Date(
          year || 1970,
          month ? month - 1 : 0,
          day || 1
        );
        const endDate = new Date(
          year || 9999,
          month ? month - 1 : 11,
          day || new Date(year || 9999, month ? month : 12, 0).getDate()
        );
        filter.createdAt = { $gte: startDate, $lte: endDate };
      }

      const alerts = await Alert.find(filter);
      if (alerts.length === 0) {
        return res.status(404).json({ message: "No se encontraron alertas para este usuario." });
      }
      res.status(200).json(alerts);
    } catch (error) {
      console.error("Error al obtener las alertas del usuario:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Registrar o actualizar una alerta
  router.post("/", async (req, res) => {
    try {
      const { userId, lat, lng } = req.body;

      if (!userId || typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ message: "Faltan datos obligatorios o son inválidos." });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      const userInfo = {
        nombre: user.nombre || "Sin nombre",
        apellido: user.apellido || "Sin apellido",
        correo: user.correo || "Sin correo",
        direccion: user.direccion || "Sin dirección",
        telefono: user.telefono || "Sin teléfono",
      };

      let existingAlert = await Alert.findOne({ userId, isActive: true });

      if (existingAlert) {
        existingAlert.lat = lat;
        existingAlert.lng = lng;
        await existingAlert.save();

        io.emit("alertUpdate", { ...existingAlert.toObject(), userInfo });
        return res.status(200).json({ message: "Alerta actualizada.", alert: existingAlert });
      }

      const newAlert = new Alert({ userId, lat, lng, isActive: true, userInfo });
      await newAlert.save();

      io.emit("newAlert", { ...newAlert.toObject(), userInfo });
      res.status(201).json({ message: "Nueva alerta registrada.", alert: newAlert });
    } catch (error) {
      console.error("Error al manejar la alerta:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Desactivar una alerta activa
  router.delete("/", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Faltan datos obligatorios." });
      }

      const alert = await Alert.findOneAndUpdate(
        { userId, isActive: true },
        { isActive: false }
      );

      if (!alert) {
        return res.status(404).json({ message: "No se encontró ninguna alerta activa." });
      }

      const user = await User.findById(alert.userId);
      const userInfo = {
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        direccion: user.direccion,
        telefono: user.telefono,
      };

      await moveAlertToHistory(alert, userInfo);
      io.emit("alertDeactivated", { alerta: alert }); // Emitir toda la alerta
      res.status(200).json({ message: "Alerta desactivada y movida al historial." });
    } catch (error) {
      console.error("Error al desactivar la alerta:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Marcar manualmente una alerta como completada
  router.post("/complete", async (req, res) => {
    try {
      const { alertId } = req.body;

      const alert = await Alert.findById(alertId);
      if (!alert) {
        return res.status(404).json({ message: "Alerta no encontrada." });
      }

      const user = await User.findById(alert.userId);
      const userInfo = {
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        direccion: user.direccion,
        telefono: user.telefono,
      };

      await moveAlertToHistory(alert, userInfo);
      io.emit("alertDeactivated", { alerta: alert }); // Emitir toda la alerta
      res.status(200).json({ message: "Alerta marcada como completada." });
    } catch (error) {
      console.error("Error al completar alerta manualmente:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  return router;
};
