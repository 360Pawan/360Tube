import mongoose, { Schema, Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  username: string;
  email: string;
  fullName: string;
  avatar: {
    url: string;
    publicId: string;
  };
  coverImage: {
    url?: string;
    publicId?: string;
  };
  watchHistory: Types.ObjectId[];
  password: string;
  refreshToken?: string;
  emailToken?: string;
  isVerifiedEmail: boolean;

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  generateEmailToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    coverImage: {
      url: { type: String },
      publicId: { type: String },
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: true,
    },
    isVerifiedEmail: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    emailToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id as Types.ObjectId,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY as string,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id as Types.ObjectId,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY as string,
    }
  );
};

userSchema.methods.generateEmailToken = function () {
  return jwt.sign(
    { _id: this._id as Types.ObjectId },
    process.env.EMAIL_TOKEN_SECRET as string,
    {
      expiresIn: process.env.EMAIL_TOKEN_EXPIRY as string,
    }
  );
};

export const User = mongoose.model<IUser>("User", userSchema);
