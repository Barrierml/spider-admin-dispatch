import script from "../src/index.js"
import { fileNameFullList } from "../src/uitl.js"
import emt from "events";




class scriptDispatcher extends emt {
    constructor(dir) {
        super();
        this.dir = dir;
        this.ws = null;
        this.jsList = fileNameFullList(dir);
        this.mission = this.jsList.map((fileName, logger) => {
            return new script({
                file_url: fileName,
                //所有logger导入到内部
                logger: this.logDispatch.bind(this),
            })
        });
    }

    getSpider() {
        return this.mission.map((e) => {
            return {
                name: e.fileName,
                status: e.started ? "运行中" : "已停止",
            }
        })
    }

    openSpider(name) {
        return new Promise((resolve) => {
            for (let i = 0; i < this.mission.length; i++) {
                const s = this.mission[i];
                if (s.fileName === name) {
                    if (!script.started) {
                        s.once("start", () => {
                            resolve(true);
                        })
                        s.start()
                    }
                    else {
                        resolve(false)
                    }
                }
            }
        })
    }

    //deal all log from child_process to web
    logDispatch(name, level, data) {
        this.send({
            type: "add_log",
            name,
            level,
            data,
        })
    }

    //send script log to web
    getLog() {
        return [];
    }

    send(res) {
        this.ws && this.ws.send(JSON.stringify({ type: "set", res }))
    }
}

const dd = new scriptDispatcher("C:\\Users\\Administrator\\Desktop\\develop\\splier-admin\\dispatcher\\spiders");
export { dd };


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
    ws.on('message', async (data) => {
        if (!data) return;
        data = JSON.parse(data);
        const id = data.id;
        console.log("收到消息", data);
        let res = await applyRequest(data);
        //return res with id
        ws.send(JSON.stringify({ type: "return", id, res }));
    })
    ws.on('close', () => {
        dd.ws = null;
        console.log("客户端已关闭");
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
        case "log":
            return await dd.getLog(parma);
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