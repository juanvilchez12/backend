const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  correo: { type: String, required: true, unique: true },
  telefono: { type: String, required: true },
  contrasena: { type: String, required: true },
  direccion: { type: String, required: true },
  foto: { type: String, required: true },
  rol: { type: String, enum: ["admin", "user"], default: "user" },
}, { timestamps: true }); // Agregado timestamps para createdAt y updatedAt

userSchema.pre("save", async function (next) {
  if (this.isModified("contrasena")) {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
