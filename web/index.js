import express from "express";
import expressws from "express-ws";
import hander from "./ws_spider.js"

let app = express();
expressws(app);
app.use("/src", express.static("../src"));
app.ws("/spider", function (ws, req) {
    ws.send(JSON.stringify({ type: "connected", msg: "success" }))
    ws.on('message', async (data) => {
        let res = await hander(data);
        ws.send(JSON.stringify(res));
    })
})
app.get("/", function (req, res) {
    res.redirect('/src/index.html')
})
app.listen(4000, () => {
    console.log(`Example app listening at http://localhost:${4000}`)
})