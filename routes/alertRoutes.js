const express = require("express");
const router = express.Router();

const Alert = require("../models/Alert");
const CompletedAlert = require("../models/CompletedAlert");
const User = require("../models/User");

module.exports = (io) => {
  // Función para mover una alerta al historial
  const moveAlertToHistory = async (alert, userInfo, comment = "") => {
    const completedAlert = new CompletedAlert({
      userId: alert.userId,
      lat: alert.lat,
      lng: alert.lng,
      userInfo,
      completedAt: new Date(),
      comment: comment || "Sin comentario",
    });

    await completedAlert.save();   // Guardar en "CompletedAlert"
    await Alert.findByIdAndDelete(alert._id); // Eliminar de "Alert"
  };

  // Lógica para mover alertas automáticamente tras 40 min
  const moveAlertsToHistoryAutomatically = async () => {
    try {
      const alerts = await Alert.find({ isActive: true });
      const threshold = 40 * 60 * 1000; // 40 minutos en ms
      const now = Date.now();

      alerts.forEach(async (alert) => {
        const timeElapsed = now - alert.createdAt.getTime();

        if (timeElapsed > threshold) {
          const user = await User.findById(alert.userId).select(
            "nombre apellido correo direccion telefono foto"
          );
          const userInfo = {
            nombre: user?.nombre || "Sin nombre",
            apellido: user?.apellido || "Sin apellido",
            correo: user?.correo || "Sin correo",
            direccion: user?.direccion || "Sin dirección",
            telefono: user?.telefono || "Sin teléfono",
            foto: user?.foto || "placeholder.jpg",
          };

          await moveAlertToHistory(alert, userInfo);
          console.log(`Alerta ${alert._id} movida al historial (auto).`);
        }
      });
    } catch (error) {
      console.error("Error al mover alertas al historial automáticamente:", error);
    }
  };

  // Ejecutar función cada minuto
  setInterval(moveAlertsToHistoryAutomatically, 60 * 1000);

  //
  // Rutas
  //

  // Test
  router.get("/test", (req, res) => {
    console.log("GET /api/alerts/test");
    res.json({ message: "Ruta de alertas funcionando." });
  });

  // RUTA PARA OBTENER ALERTAS COMPLETADAS
  router.get("/completed", async (req, res) => {
    console.log("→ GET /api/alerts/completed");
    try {
      const { day, month, year } = req.query;
      let filter = {};

      if (day || month || year) {
        const startDate = new Date(year || 1970, month ? month - 1 : 0, day || 1);
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
      console.error("Error al obtener alertas completadas:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // RUTA PARA TODAS LAS ALERTAS ACTIVAS
  router.get("/", async (req, res) => {
    console.log("→ GET /api/alerts/");
    try {
      const alerts = await Alert.find();
      res.status(200).json(alerts);
    } catch (error) {
      console.error("Error al obtener las alertas:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // RUTA PARA ALERTAS DE UN USUARIO ESPECÍFICO
  router.get("/:userId", async (req, res) => {
    console.log("→ GET /api/alerts/:userId");
    const { userId } = req.params;
    const { day, month, year } = req.query;

    try {
      let filter = { userId };
      if (day || month || year) {
        const startDate = new Date(year || 1970, month ? month - 1 : 0, day || 1);
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
    console.log("→ POST /api/alerts");
    try {
      const { userId, lat, lng } = req.body;

      if (!userId || typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ message: "Faltan datos o son inválidos." });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      const userInfo = {
        nombre: user?.nombre || "Sin nombre",
        apellido: user?.apellido || "Sin apellido",
        correo: user?.correo || "Sin correo",
        direccion: user?.direccion || "Sin dirección",
        telefono: user?.telefono || "Sin teléfono",
        foto: user?.foto || "placeholder.jpg", // <--- AQUÍ SÍ pones la foto
      };
      

      // Verificar si ya existe una alerta activa de este usuario
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

  // Eliminar una alerta activa
  router.delete("/:alertId", async (req, res) => {
    console.log("→ DELETE /api/alerts/:alertId");
    try {
      const { alertId } = req.params;

      const alert = await Alert.findByIdAndDelete(alertId);
      if (!alert) {
        return res.status(404).json({ message: "No se encontró ninguna alerta con ese ID." });
      }

      io.emit("alertDeleted", { alerta: alert });
      res.status(200).json({ message: "Alerta eliminada exitosamente." });
    } catch (error) {
      console.error("Error al eliminar la alerta:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Marcar manualmente una alerta como completada
  router.post("/complete", async (req, res) => {
    console.log("→ POST /api/alerts/complete");
    try {
      const { alertId, comment } = req.body;

      // Validar longitud del comentario
      if (comment && comment.length > 120) {
        return res
          .status(400)
          .json({ message: "El comentario no debe superar los 120 caracteres." });
      }

      const alert = await Alert.findById(alertId);
      if (!alert) {
        return res.status(404).json({ message: "Alerta no encontrada." });
      }

      const user = await User.findById(alert.userId);
      const userInfo = {
        nombre: user.nombre || "Sin nombre",
        apellido: user.apellido || "Sin apellido",
        correo: user.correo || "Sin correo",
        direccion: user.direccion || "Sin dirección",
        telefono: user.telefono || "Sin teléfono",
      };

      await moveAlertToHistory(alert, userInfo, comment);
      // Notificar al cliente que la alerta se completó
      io.emit("alertDeactivated", {
        type: "alertDeactivated",
        alertId,
        userId: alert.userId,
      });

      res.status(200).json({
        message: "Alerta marcada como completada y movida al historial.",
      });
    } catch (error) {
      console.error("Error al completar alerta manualmente:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  // Ruta para detener el envío de coordenadas (opcional)
  router.post("/stop-location", async (req, res) => {
    console.log("→ POST /api/alerts/stop-location");
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "Falta el userId." });
      }

      io.emit("stopLocation", { type: "stopLocation", userId });
      res.status(200).json({ message: "Ubicación detenida para el usuario." });
    } catch (error) {
      console.error("Error al detener la ubicación:", error);
      res.status(500).json({ message: "Error del servidor." });
    }
  });

  return router;
};
