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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}


