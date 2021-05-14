
import dd from "./dispatcher.js"
import logger from "../common/logger.js"
// Standard data type 
// {
//     id: 1, for promise resolve
//     req: { 
//         type: "some type",
//         msg: "real message" 
//     }
// }

export default function hander(ws, req) {
    dd.ws = ws;
    ws.send(JSON.stringify({ type: "system", res: "connected" }))
    logger.mark(`客户端已连接`)
    ws.on('message', async (data) => {
        if (!data) return;
        data = JSON.parse(data);
        const id = data.id;
        logger.info("收到消息", data);
        let res = await applyRequest(data);
        //return res with id
        ws.send(JSON.stringify({ type: "return", id, res }));
    })
    ws.on('close', () => {
        dd.ws = null;
        logger.mark("客户端已关闭");
    });
}

//ws dispatcher
async function applyRequest(data) {
    const { type, msg } = data;
    if (type === "get") {
        return await applyGet(msg, data.parma);
    }
    else if (type === "set") {
        return await applySet(msg, data.parma);
    }
}
//deal with get
async function applyGet(msg, parma) {
    switch (msg) {
        case "list":
            return dd.getSpider();
        case "open_spider":
            return await dd.openSpider(parma);
        case "stop_spider":
            return dd.stopSpider(parma);
        case "log":
            return await dd.getLog(parma);
        case "set_spider":
            return dd.setSpider(parma)
        default:
            return "not found";
    }
}

//deal with set
async function applySet(msg, parma) {
    switch (msg) {
        default:
            return "not found";
    }
}