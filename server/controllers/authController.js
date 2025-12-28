import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import sendEmail from "../utils/sendEmail.js";

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

        const verificationToken = crypto.randomBytes(32).toString("hex");

        const company = await Company.create({
            name,
            email,
            password: hashedPassword,
            role: "company",
            verificationToken,
        });

        const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;

        const message = `YakoGroups Quiz'e hoş geldiniz! Lütfen hesabınızı doğrulamak için şu linke tıklayın: ${verificationUrl}`;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5;">YakoGroups Quiz'e Hoş Geldiniz!</h2>
                <p>Merhaba ${name},</p>
                <p>Hesabınızı başarıyla oluşturduk. Sınavlarınızı yönetmeye başlamak için lütfen aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Hesabımı Doğrula</a>
                </div>
                <p style="color: #666; font-size: 12px;">Eğer bu butona tıklayamıyorsanız şu linki tarayıcınıza yapıştırın:</p>
                <p style="color: #666; font-size: 12px;">${verificationUrl}</p>
            </div>
        `;

        try {
            await sendEmail({
                email: company.email,
                subject: "E-posta Adresinizi Doğrulayın",
                message,
                html,
            });
        } catch (err) {
            console.error("Mail gönderim hatası:", err);
        }

        res.status(201).json({
            message: "Kayıt başarılı. Lütfen e-posta adresinizi doğrulamak için size gönderdiğimiz maili kontrol edin.",
            _id: company._id,
            name: company.name,
            email: company.email,
            role: company.role,
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

        if (!company.isEmailVerified) {
            return res.status(403).json({
                message: "Lütfen önce e-posta adresinizi doğrulayın. Size gönderdiğimiz maildeki linke tıklayın.",
                notVerified: true
            });
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
            logo: company.logo,
            token: generateToken(company._id),
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};

export const updateCompanyLogo = async (req, res) => {
    try {
        const { logo } = req.body;
        const company = await Company.findByIdAndUpdate(
            req.company._id,
            { logo },
            { new: true }
        ).select("-password");

        if (!company) {
            return res.status(404).json({ message: "Şirket bulunamadı." });
        }

        res.json(company);
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        const company = await Company.findOne({ verificationToken: token });

        if (!company) {
            return res.status(400).json({ message: "Geçersiz veya süresi dolmuş doğrulama token'ı." });
        }

        company.isEmailVerified = true;
        company.verificationToken = undefined;
        await company.save();

        res.json({ message: "E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz." });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const company = await Company.findOne({ email });

        if (!company) {
            return res.status(404).json({ message: "Bu email adresiyle kayıtlı bir şirket bulunamadı." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        company.resetPasswordToken = resetToken;
        company.resetPasswordExpire = Date.now() + 3600000;
        await company.save();

        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
        const message = `YakoGroups Quiz şifrenizi sıfırlamak için şu linke tıklayın: ${resetUrl}`;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Şifre Sıfırlama Talebi</h2>
                <p>Merhaba ${company.name},</p>
                <p>Hesabınız için bir şifre sıfırlama talebi aldık. Şifrenizi yenilemek için lütfen aşağıdaki butona tıklayın:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Şifremi Sıfırla</a>
                </div>
                <p style="color: #666; font-size: 12px;">Eğer bu talebi siz yapmadıysanız bu maili görmezden gelebilirsiniz. Bu link 1 saat boyunca geçerlidir.</p>
                <p style="color: #666; font-size: 12px;">Eğer butona tıklayamıyorsanız şu linki tarayıcınıza yapıştırın:</p>
                <p style="color: #666; font-size: 12px;">${resetUrl}</p>
            </div>
        `;

        try {
            await sendEmail({
                email: company.email,
                subject: "Şifre Sıfırlama Talebi",
                message,
                html,
            });
            res.json({ message: "Şifre sıfırlama linki e-posta adresinize gönderildi." });
        } catch (err) {
            company.resetPasswordToken = undefined;
            company.resetPasswordExpire = undefined;
            await company.save();
            return res.status(500).json({ message: "Mail gönderilemedi." });
        }
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const company = await Company.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!company) {
            return res.status(400).json({ message: "Geçersiz veya süresi dolmuş token." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: "Şifre en az 8 karakter olmalı, bir büyük harf, bir küçük harf ve bir rakam içermelidir.",
            });
        }

        const isSamePassword = await bcrypt.compare(password, company.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "Yeni şifre eskisiyle aynı olamaz. Lütfen farklı bir şifre belirleyin." });
        }

        const salt = await bcrypt.genSalt(10);
        company.password = await bcrypt.hash(password, salt);
        company.resetPasswordToken = undefined;
        company.resetPasswordExpire = undefined;
        await company.save();

        res.json({ message: "Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz." });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};

export const checkResetToken = async (req, res) => {
    try {
        const { token } = req.query;

        const company = await Company.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!company) {
            return res.status(400).json({ message: "Geçersiz veya süresi dolmuş token." });
        }

        res.json({ message: "Token geçerli." });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası.", error: error.message });
    }
};
