import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from './user.model.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import { createDefaultWorkspace } from '../workspaces/workspace.service.js';
function createToken(userId) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  return jwt.sign({ sub: userId.toString() }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'teamflow-api',
    audience: 'teamflow-client',
  });
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function register(req, res, next) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration data',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const name = result.data.name;
    const email = result.data.email.toLowerCase();
    const password = result.data.password;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    let workspace;

    try {
      workspace = await createDefaultWorkspace(user);
    } catch (error) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (cleanupError) {
        console.error(
          "Failed to clean up user after workspace creation failed:",
          cleanupError
        );
      }

      throw error;
    }

    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
        role: 'owner',
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and password',
      });
    }

    const email = result.data.email.toLowerCase();
    const password = result.data.password;

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: publicUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
}
