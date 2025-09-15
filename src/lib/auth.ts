import { NextRequest } from 'next/server';
import { IUser } from '@/types';
import { createToken } from '@/lib/auth-edge';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET environment variable is not set. Using fallback secret.');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved' | 'rejected';
  memberId: string;
}

// Generate JWT token
export async function generateToken(user: IUser): Promise<string> {
  if (!user.email) {
    throw new Error('Cannot generate token for user without email');
  }

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    status: user.status,
    memberId: user.memberId,
  };

  return await createToken(payload);
}

// Note: JWT verification is now handled by auth-edge.ts for Edge Runtime compatibility

// Extract token from request
export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const token = request.cookies.get('auth-token')?.value;
  return token || null;
}

// Validate user credentials
export async function validateUserCredentials(email: string, password: string) {
  try {
    const User = (await import('@/models/User')).default;
    await (await import('@/lib/mongodb')).default();

    // Find user with password field
    const user = await User.findOne({ email, isActive: true }).select('+password');

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = await generateToken(user);

    return {
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        memberId: user.memberId,
        phone: user.phone,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
      },
      token,
    };
  } catch (error) {
    console.error('Validation error:', error);
    return { success: false, message: 'Authentication failed' };
  }
}

// Password validation
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: 'Password must contain at least one letter and one number' };
  }

  return { isValid: true };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation
export function validatePhone(phone: string): boolean {
  // If phone is empty, it's valid (since it's optional now)
  if (!phone || !phone.trim()) {
    return true;
  }
  // Basic phone validation - adjust based on your region
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}
