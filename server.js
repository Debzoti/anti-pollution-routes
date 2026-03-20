import express from "express";
import cors from "cors";
import config from "./config.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});