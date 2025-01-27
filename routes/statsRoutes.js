const express = require("express");
const { verifyToken } = require("../middleware/verifyToken");
const Statistic = require("../models/Statistic");
const GeneralStatistic = require("../models/GeneralStatistic"); // Importar modelo de estadísticas generales

const router = express.Router();

// Registrar una estadística
router.post("/", verifyToken, async (req, res) => {
  try {
    const { action, timestamp } = req.body;

    if (!action) {
      return res.status(400).json({ message: "La acción es obligatoria." });
    }

    // Registrar estadística individual del usuario
    const statistic = new Statistic({
      userId: req.user.id, // Se extrae del token
      action,
      timestamp,
    });

    await statistic.save();

    // Registrar o actualizar estadísticas generales
    const generalStatistic = await GeneralStatistic.findOne({ action });
    if (generalStatistic) {
      // Si ya existe, incrementar el contador
      generalStatistic.count += 1;
      await generalStatistic.save();
      console.log(`Estadística general actualizada: ${action}, Total: ${generalStatistic.count}`);
    } else {
      // Si no existe, crear una nueva estadística general
      const newGeneralStatistic = new GeneralStatistic({
        action,
        count: 1,
      });
      await newGeneralStatistic.save();
      console.log(`Nueva estadística general creada: ${action}`);
    }

    console.log("Estadística guardada:", statistic); // Verificar que se guarda correctamente

    res.status(201).json({
      message: "Estadística registrada exitosamente.",
      statistic,
    });
  } catch (error) {
    console.error("Error al registrar estadística:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

// Obtener estadísticas generales con filtros
router.get("/general", async (req, res) => {
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
      filter.timestamp = { $gte: startDate, $lte: endDate };
    }

    const generalStatistics = await GeneralStatistic.find(filter); // Obtener estadísticas generales filtradas
    res.status(200).json(generalStatistics);
  } catch (error) {
    console.error("Error al obtener estadísticas generales:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

// Obtener estadísticas individuales con filtros
router.get("/", verifyToken, async (req, res) => {
  try {
    const { day, month, year } = req.query;

    let filter = { userId: req.user.id };
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
      filter.timestamp = { $gte: startDate, $lte: endDate };
    }

    const statistics = await Statistic.find(filter); // Obtener estadísticas individuales filtradas
    res.status(200).json(statistics);
  } catch (error) {
    console.error("Error al obtener estadísticas individuales:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

module.exports = router;
