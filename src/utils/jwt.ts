import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface JwtPayload {
  userId: string;
  email: string;
}

export const decodeKey = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
