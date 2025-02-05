// models/CompletedAlert.js
const mongoose = require("mongoose");

const completedAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    userInfo: {
      nombre: { type: String, required: false },
      apellido: { type: String, required: false },
      correo: { type: String, required: false },
      direccion: { type: String, required: false },
      telefono: { type: String, required: false },
      foto: { type: String, required: false },  // <--- Agrega este campo
    },
    completedAt: { type: Date, default: Date.now },
    comment: { type: String, required: false, default: "Sin comentario" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompletedAlert", completedAlertSchema);
