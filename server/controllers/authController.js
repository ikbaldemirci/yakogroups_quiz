import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Company from "../models/Company.js";

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret", {
        expiresIn: "30d",
    });
};

export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Geçersiz email formatı." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                    "Şifre en az 8 karakter olmalı, bir büyük harf, bir küçük harf ve bir rakam içermelidir.",
            });
        }

        const companyExists = await Company.findOne({ email });
        if (companyExists) {
            return res.status(400).json({ message: "Bu email zaten kullanımda." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const company = await Company.create({
            name,
            email,
            password: hashedPassword,
            role: "company",
        });

        res.status(201).json({
            _id: company._id,
            name: company.name,
            email: company.email,
            role: company.role,
            token: generateToken(company._id),
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const company = await Company.findOne({ email });

        if (!company) {
            console.log(`Login failed: Email not found - ${email}`);
            return res.status(401).json({ message: "Bu email adresi bulunamadı." });
        }

        const isMatch = await bcrypt.compare(password, company.password);
        if (!isMatch) {
            console.log(`Login failed: Wrong password for - ${email}`);
            return res.status(401).json({ message: "Hatalı şifre." });
        }

        console.log(`Login success: ${email}`);

        res.json({
            _id: company._id,
            name: company.name,
            email: company.email,
            role: company.role,
            token: generateToken(company._id),
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};
