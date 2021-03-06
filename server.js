const express = require("express");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

//라우터 관련
const books = require("./routes/books");

//익스프레스 연결
const app = express();

app.use(express.json());

//라우터 처리 부분
app.use("/api/v1/books", books);

const PORT = process.env.PORT || 5800;

app.listen(PORT, () => {
  console.log("App listening on port 5800!");
});

app.get("/", (req, res) => {
  res.status(200).json({ success: true });
});
