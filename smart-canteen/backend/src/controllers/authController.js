const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, usn_or_id: user.usn_or_id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Separate short-lived token type for password reset, so a reset link/code
// can't be reused as a login session.
function signResetToken(user) {
  return jwt.sign(
    { id: user.id, purpose: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateReferralCode(usn_or_id) {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${usn_or_id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}${suffix}`;
}

// Simple, self-contained loyalty numbers — no external loyalty platform.
const REFERRAL_BONUS_POINTS = 50;

exports.register = async (req, res) => {
  try {
    const { name, phone, password, role, email, referral_code } = req.body;
    // Normalized once here — login is case-insensitive, so "Student" and
    // "student" are the same account either way.
    const usn_or_id = req.body.usn_or_id?.trim().toLowerCase();

    if (!name || !usn_or_id || !phone || !password) {
      return res.status(400).json({ error: 'name, USN/staff ID, phone number and password are required' });
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }

    const existing = await User.findOne({ where: { usn_or_id } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this USN/ID already exists' });
    }
    const phoneTaken = await User.findOne({ where: { phone } });
    if (phoneTaken) {
      return res.status(409).json({ error: 'This phone number is already registered' });
    }

    let referrer = null;
    if (referral_code) {
      referrer = await User.findOne({ where: { referral_code: referral_code.toUpperCase() } });
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
    }

    // Only allow self-registration as student/staff; admin/canteen_staff
    // accounts should be created by an existing admin in a real deployment.
    const safeRole = ['student', 'staff'].includes(role) ? role : 'student';

    const password_hash = await bcrypt.hash(password, 10);
    let myReferralCode = generateReferralCode(usn_or_id);
    // extremely unlikely collision, but guard anyway
    while (await User.findOne({ where: { referral_code: myReferralCode } })) {
      myReferralCode = generateReferralCode(usn_or_id);
    }

    const user = await User.create({
      name, usn_or_id, phone, email, password_hash, role: safeRole,
      referral_code: myReferralCode,
      referred_by_code: referrer ? referrer.referral_code : null,
      reward_points: referrer ? REFERRAL_BONUS_POINTS : 0,
    });

    if (referrer) {
      await referrer.increment('reward_points', { by: REFERRAL_BONUS_POINTS });
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id, name: user.name, usn_or_id: user.usn_or_id, role: user.role,
        wallet_balance: user.wallet_balance, reward_points: user.reward_points, referral_code: user.referral_code,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    const usn_or_id = req.body.usn_or_id?.trim().toLowerCase();
    if (!usn_or_id || !password) {
      return res.status(400).json({ error: 'USN/staff ID and password are required' });
    }

    const user = await User.findOne({ where: { usn_or_id } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid USN/ID or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid USN/ID or password' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id, name: user.name, usn_or_id: user.usn_or_id, role: user.role,
        wallet_balance: user.wallet_balance, reward_points: user.reward_points, referral_code: user.referral_code,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'name', 'usn_or_id', 'role', 'phone', 'email', 'wallet_balance', 'reward_points', 'referral_code'],
  });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { name, email, phone } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'Account not found' });

  const updates = {};
  if (name) updates.name = name;
  if (email !== undefined) updates.email = email || null;
  if (phone) {
    if (!/^[0-9]{10}$/.test(phone)) return res.status(400).json({ error: 'Phone number must be 10 digits' });
    const taken = await User.findOne({ where: { phone } });
    if (taken && taken.id !== user.id) return res.status(409).json({ error: 'This phone number is already registered' });
    updates.phone = phone;
  }

  await user.update(updates);
  res.json({
    id: user.id, name: user.name, usn_or_id: user.usn_or_id, role: user.role, phone: user.phone, email: user.email,
    wallet_balance: user.wallet_balance, reward_points: user.reward_points, referral_code: user.referral_code,
  });
};

exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = await User.findByPk(req.user.id);
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const password_hash = await bcrypt.hash(new_password, 10);
  await user.update({ password_hash });
  res.json({ success: true });
};

// Step 1 of forgot-password: verify the student really owns this account by
// confirming their registered phone number, then issue a short-lived reset
// token. No SMS/OTP service involved — this is an identity check, not an
// OTP send, which keeps it honest about what it actually does.
exports.forgotPassword = async (req, res) => {
  const { phone } = req.body;
  const usn_or_id = req.body.usn_or_id?.trim().toLowerCase();
  if (!usn_or_id || !phone) {
    return res.status(400).json({ error: 'USN/ID and registered phone number are required' });
  }

  const user = await User.findOne({ where: { usn_or_id, phone } });
  if (!user) {
    return res.status(404).json({ error: 'No account matches that USN/ID and phone number' });
  }

  const reset_token = signResetToken(user);
  res.json({ reset_token });
};

exports.resetPassword = async (req, res) => {
  const { reset_token, new_password } = req.body;
  if (!reset_token || !new_password) {
    return res.status(400).json({ error: 'reset_token and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  let payload;
  try {
    payload = jwt.verify(reset_token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Reset link expired or invalid — please try again' });
  }
  if (payload.purpose !== 'password_reset') {
    return res.status(401).json({ error: 'Invalid reset token' });
  }

  const user = await User.findByPk(payload.id);
  if (!user) return res.status(404).json({ error: 'Account not found' });

  const password_hash = await bcrypt.hash(new_password, 10);
  await user.update({ password_hash });
  res.json({ success: true });
};
