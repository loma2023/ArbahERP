const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Set mongoose options
        mongoose.set('strictQuery', false);
        
        // استخدام المتغير أو رابط افتراضي محلي لضمان عدم ظهور خطأ undefined أبدًا
        const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/arbah_erp';

        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log("✅ MongoDB Connected");
        
        // Handle connection events
        mongoose.connection.on("error", (err) => { console.error("❌ MongoDB connection error:", err); });
        mongoose.connection.on("disconnected", () => { console.log("⚠️ MongoDB disconnected"); });
        
        // Wait a moment to ensure connection is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        return conn;
    } 
    catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
    }
};

module.exports = connectDB;