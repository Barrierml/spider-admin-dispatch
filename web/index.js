import express from "express";
import expressws from "express-ws";
import hander from "./ws_spider.js"

let app = express();
expressws(app);
app.use("/src", express.static("../src"));
app.ws("/spider", hander)
app.get("/", function (req, res) {
    res.redirect('/src/index.html')
})
app.listen(4000, () => {
    console.log(`Example app listening at http://localhost:${4000}`)
})