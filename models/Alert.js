const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    userInfo: {
      nombre: { type: String, required: false },
      apellido: { type: String, required: false },
      dni: { type: String, required: false },
      correo: { type: String, required: false },
      telefono: { type: String, required: false },
      direccion: { type: String, required: false },
      foto: { type: String, required: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
