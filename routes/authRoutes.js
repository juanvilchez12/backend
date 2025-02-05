const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const upload = require("../middleware/upload");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Registro de Usuario
router.post("/register", upload.single("foto"), async (req, res) => {
  try {
    const { nombre, apellido, dni, correo, telefono, contrasena, direccion } = req.body;
    
    // Si se sube una foto, se toma la ruta; si no, se asigna null
    const foto = req.file ? req.file.path : null;

    // Verificación de campos obligatorios (foto ya no es obligatoria)
    if (!nombre || !apellido || !dni || !correo || !telefono || !contrasena || !direccion) {
      return res.status(400).json({ message: "Todos los campos son obligatorios, excepto la foto." });
    }

    // Verificación si el correo ya está registrado
    const existingUser = await User.findOne({ correo });
    if (existingUser) {
      return res.status(400).json({ message: "El correo ya está registrado." });
    }

    // Determinar el rol
    const isFirstUser = (await User.countDocuments()) === 0;
    const rol = isFirstUser ? "admin" : "user";

    // Crear el nuevo usuario
    const newUser = new User({
      nombre,
      apellido,
      dni,
      correo,
      telefono,
      contrasena,
      direccion,
      foto, // foto es opcional
      rol,
    });

    // Guardar el nuevo usuario
    await newUser.save();
    res.status(201).json({ message: "Usuario registrado con éxito.", rol });
  } catch (error) {
    res.status(500).json({ message: "Error del servidor.", error: error.message });
  }
});

// Inicio de Sesión
router.post("/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ message: "Por favor, complete todos los campos." });
    }

    const user = await User.findOne({ correo });
    if (!user) {
      return res.status(400).json({ message: "Credenciales inválidas." });
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) {
      return res.status(400).json({ message: "Credenciales inválidas." });
    }

    const token = jwt.sign({ id: user._id, rol: user.rol }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ message: "Inicio de sesión exitoso.", token, rol: user.rol });
  } catch (error) {
    res.status(500).json({ message: "Error del servidor.", error: error.message });
  }
});

// Obtener el usuario más nuevo
router.get("/latest", async (req, res) => {
  try {
    const latestUser = await User.findOne().sort({ createdAt: -1 });
    if (!latestUser) {
      return res.status(404).json({ message: "No se encontraron usuarios." });
    }
    res.status(200).json(latestUser);
  } catch (error) {
    console.error("Error al obtener el usuario más nuevo:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

// Obtener el usuario más antiguo
router.get("/oldest", async (req, res) => {
  try {
    const oldestUser = await User.findOne().sort({ createdAt: 1 });
    if (!oldestUser) {
      return res.status(404).json({ message: "No se encontraron usuarios." });
    }
    res.status(200).json(oldestUser);
  } catch (error) {
    console.error("Error al obtener el usuario más antiguo:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

// Obtener un usuario por ID
router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error al obtener el usuario por ID:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

// Obtener todos los usuarios
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-contrasena"); // Excluir la contraseña
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No se encontraron usuarios." });
    }
    res.status(200).json(users);
  } catch (error) {
    console.error("Error al obtener todos los usuarios:", error.message);
    res.status(500).json({ message: "Error del servidor." });
  }
});

module.exports = router;
