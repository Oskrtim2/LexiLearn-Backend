const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { User, StudentProfile, Skill, StudentSkill } = require('../models');

/**
 * Generate JWT tokens for a user
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    authConfig.jwtRefreshSecret,
    { expiresIn: authConfig.jwtRefreshExpiresIn }
  );
  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, dateOfBirth, grade } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, authConfig.saltRounds);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'student',
    });

    // Create student profile if role is student
    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.create({
        userId: user.id,
        dateOfBirth,
        grade,
        lastActiveDate: new Date().toISOString().split('T')[0],
      });

      // Initialize skills for the student
      const skills = await Skill.findAll();
      for (const skill of skills) {
        await StudentSkill.create({
          studentProfileId: profile.id,
          skillId: skill.id,
        });
      }
    }

    const tokens = generateTokens(user);

    res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: StudentProfile, as: 'profile' }],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last active date for students
    if (user.profile) {
      user.profile.lastActiveDate = new Date().toISOString().split('T')[0];
      await user.profile.save();
    }

    const tokens = generateTokens(user);

    res.json({
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        profile: user.profile,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        avatar: req.user.avatar,
        profile: req.user.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    const decoded = jwt.verify(refreshToken, authConfig.jwtRefreshSecret);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};
