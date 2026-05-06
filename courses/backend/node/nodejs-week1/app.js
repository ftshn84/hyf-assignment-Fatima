import express from "express";
import snippetsRouter from "../api/snippets.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello Class!");
});

app.use("/api/snippets", snippetsRouter);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
