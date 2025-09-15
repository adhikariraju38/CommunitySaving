import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, validatePassword, validateEmail, validatePhone } from '@/lib/auth';
import { withErrorHandling, withRateLimit } from '@/middleware/auth';

export const POST = withErrorHandling(
  withRateLimit(5, 15 * 60 * 1000)( // 5 attempts per 15 minutes
    async (request: NextRequest) => {
      const { name, email, password, confirmPassword, phone } = await request.json();

      // Basic validation
      if (!name || !email || !password || !confirmPassword || !phone) {
        return NextResponse.json(
          { success: false, message: 'All fields are required' },
          { status: 400 }
        );
      }

      // Validate password match
      if (password !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: 'Passwords do not match' },
          { status: 400 }
        );
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { success: false, message: passwordValidation.message },
          { status: 400 }
        );
      }

      // Validate email format
      if (!validateEmail(email)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Validate phone format
      if (!validatePhone(phone)) {
        return NextResponse.json(
          { success: false, message: 'Invalid phone number format' },
          { status: 400 }
        );
      }

      await connectToDatabase();

      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: email.toLowerCase().trim() },
          { phone: phone.trim() }
        ]
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'User with this email or phone already exists' },
          { status: 409 }
        );
      }

      // Generate unique member ID
      const memberId = await User.generateMemberId();

      // Create new user
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone: phone.trim(),
        memberId,
        role: 'member', // New registrations are members by default
        isActive: true,
        joinDate: new Date(),
      });

      const savedUser = await newUser.save();

      // Generate token
      const token = await generateToken(savedUser);

      // Create response
      const response = NextResponse.json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            _id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role,
            memberId: savedUser.memberId,
            phone: savedUser.phone,
            joinDate: savedUser.joinDate,
          },
          token,
        },
      }, { status: 201 });

      // Set HTTP-only cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }
  )
);
