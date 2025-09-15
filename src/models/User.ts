import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types';

// Define interface for static methods
interface IUserModel extends Model<IUser> {
  generateMemberId(): Promise<string>;
  findByEmail(email: string): Promise<IUser | null>;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: false, // Made optional for bulk-added members
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: false, // Made optional for bulk-added members
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    phone: {
      type: String,
      required: false, // Made optional for bulk-added members
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    memberId: {
      type: String,
      required: [true, 'Member ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hasLoginAccess: {
      type: Boolean,
      default: false, // True only when both email and password are provided
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Use optional delete for better type safety
        if ('password' in ret) {
          delete (ret as any).password;
        }
        return ret;
      },
    },
  }
);

// Index for better query performance (email and memberId unique indexes are already defined in schema)
UserSchema.index({ role: 1, isActive: 1 });

// Pre-save middleware to hash password and update hasLoginAccess
UserSchema.pre('save', async function (next) {
  // Update hasLoginAccess based on email and password presence
  this.hasLoginAccess = !!(this.email && this.password);

  // Hash password if it's modified and exists
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(String(this.password), salt);
    } catch (error: any) {
      return next(error);
    }
  }

  next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email with password
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email }).select('+password');
};

// Generate unique member ID
UserSchema.statics.generateMemberId = async function (): Promise<string> {
  const count = await this.countDocuments();
  const memberId = `CSL${String(count + 1).padStart(4, '0')}`;

  // Check if ID already exists (edge case)
  const existingUser = await this.findOne({ memberId });
  if (existingUser) {
    // If exists, try with current timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `CSL${timestamp}`;
  }

  return memberId;
};

const User = (mongoose.models.User || mongoose.model<IUser, IUserModel>('User', UserSchema)) as IUserModel;

export default User;
