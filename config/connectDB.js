const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Log para verificar si la URI está correctamente cargada
    console.log("Conectando a MongoDB con URI:", process.env.MONGO_URI);

    // Conectar a la base de datos MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Conexión a MongoDB exitosa.");
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error.message);
    process.exit(1);  // Detener el proceso si no se puede conectar a MongoDB
  }
};

module.exports = connectDB;
