import express, { type Express, type Request, type Response } from "express";
import "dotenv/config";

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(3000, () => console.log("server's running on port : ", port));
