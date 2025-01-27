const mongoose = require("mongoose");

const generalStatisticSchema = new mongoose.Schema({
  action: { type: String, required: true, unique: true }, // Nombre del botón
  count: { type: Number, default: 0 }, // Contador de cuántas veces se presionó
});

module.exports = mongoose.model("GeneralStatistic", generalStatisticSchema);
