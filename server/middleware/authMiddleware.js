import jwt from "jsonwebtoken";
import Company from "../models/Company.js";

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({ message: "Yetkisiz erişim, geçersiz token." });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");

            req.company = await Company.findById(decoded.id).select("-password");
            next();
        } catch (error) {
            console.error("JWT Verification Error:", error.message);
            res.status(401).json({ message: "Yetkisiz erişim, token geçersiz." });
        }
    } else if (!token) {
        res.status(401).json({ message: "Yetkisiz erişim, token bulunamadı." });
    }
}
