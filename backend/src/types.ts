import { Request } from 'express';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  profilePictureUrl?: string;
  statusText?: string;
  onlineStatus?: boolean;
  lastSeen?: Date;
  tokenVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JwtPayloadType {
  userId: string;
  email: string;
  username: string;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayloadType;
}

export interface SignInBody {
  email: string;
  password: string;
}
