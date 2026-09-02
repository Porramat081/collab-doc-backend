import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "development-secret";

export interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
}

export const createKey = (payload: JwtPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const decodeKey = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
