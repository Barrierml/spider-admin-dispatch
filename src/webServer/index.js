import express from "express";
import expressws from "express-ws";
import logger from "../common/logger.js";
import hander from "./ws_spider.js"
import path from "path"
const relativeDir = path.dirname(import.meta.url).slice(8);
const { join } = path;

let app = express();
expressws(app);
app.use("/", express.static(join(relativeDir, "../web/")));
app.ws("/spider", hander)
app.get("/", function (req, res) {
    res.sendFile(join(relativeDir, "../web/index.html"));
})
app.listen(4000, () => {
    logger.mark(`服务器已开启，地址为: http://localhost:${4000}`)
})