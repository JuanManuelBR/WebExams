import app from "./app";

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Microservicio Exams corriendo en http://localhost:${port}`);
});
