const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'super_secure_municipal_jwt_secret_key_2026_dev',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

// @desc    Register a new Citizen
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const name = (req.body.name || req.body.fullName || '').trim();
    const email = (req.body.email || '').toLowerCase().trim();
    const mobile = (req.body.mobile || '').trim();
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const address = (req.body.address || '').trim();
    const city = (req.body.city || '').trim();
    const state = (req.body.state || '').trim();
    const pincode = (req.body.pincode || req.body.pinCode || '').trim();

    // Validation
    if (!name || !email || !mobile || !password || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required. Please fill in all required registration fields.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match.',
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.',
      });
    }

    // SECURITY: Public registration ALWAYS enforces role = 'citizen'
    const user = await User.create({
      name,
      email,
      mobile,
      password,
      address,
      city,
      state,
      pincode,
      role: 'citizen', // Enforced citizen role
    });

    const token = generateToken(user);

    // Audit Log
    await logAudit({
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'USER_REGISTERED',
      targetRecordId: user._id.toString(),
      details: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Citizen account registered successfully.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Authenticate User and Get Token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact administration.',
      });
    }

    const token = generateToken(user);

    // Audit Log
    await logAudit({
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'USER_LOGIN',
      targetRecordId: user._id.toString(),
      details: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Get Current Authenticated User Profile
// @route   GET /api/auth/profile
// @access  Private (Protected)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }
    return res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching profile',
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
