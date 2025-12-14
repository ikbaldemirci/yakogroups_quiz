import Company from "../models/Company.js";

export const createCompany = async (req, res) => {
  try {
    const { name, email, website, description } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Company name and email are required",
      });
    }

    const existingCompany = await Company.findOne({ email });
    if (existingCompany) {
      return res.status(409).json({
        message: "Company with this email already exists",
      });
    }

    const company = await Company.create({
      name,
      email,
      website,
      description,
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create company",
      error: error.message,
    });
  }
};

export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch companies",
    });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company || !company.isActive) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch company",
    });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.status(200).json(updatedCompany);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update company",
      error: error.message,
    });
  }
};

export const deactivateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.status(200).json({
      message: "Company deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to deactivate company",
    });
  }
};
