import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
}

export const createKey = (payload: JwtPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

export const decodeKey = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
