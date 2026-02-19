import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(__dirname, "..", "config", `.env.${process.env.NODE_ENV ?? "development"}`),
});

import app from "./app";

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Microservicio Exams corriendo en http://localhost:${port}`);
});
