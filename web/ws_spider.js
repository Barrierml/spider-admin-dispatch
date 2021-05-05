import script from "../src/index.js"
import { fileNameFullList } from "../src/uitl.js"
import emt from "events";
import { spidersModel, getLogModel } from "./model.js"
import _ from "lodash";
const { find } = _;

async function reLoad(list, cb) {
    await spidersModel.sync();
    for (let e of list) {
        [e.spiderModel] = await spidersModel.findOrCreate({
            where: { fileName: e.fileName },
        })
        e.logModel = getLogModel(e.fileName);
        await e.logModel.sync();
    };
    cb && cb();
}



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
        reLoad(this.mission, this.inited.bind(this));
    }

    inited() {
        console.log("数据库初始化完毕");
        //绑定关闭事件
        const self = this;
        this.mission.forEach((e) => {
            e.on("close", function () {
                self.send({
                    type: "spider_close",
                    name: this.fileName,
                })
            })
            e.on("start", function () {
                self.send({
                    type: "spider_open",
                    name: this.fileName,
                })
            })
        })
    }

    getSpider() {
        return this.mission.map((e) => {
            return {
                name: e.spiderModel.name || e.fileName,
                status: e.started ? "运行中" : "已停止",
                rate: e.spiderModel.schedule,
                last_run: e.spiderModel.last_run,
            }
        })
    }


    stopSpider(name){
        const s = find(this.mission, { fileName: name });
        if(!s) return false;
        s.stop();
        return true;
    }


    openSpider(name) {
        return new Promise((resolve) => {
            const s = find(this.mission, { fileName: name });
            if (!s) {
                resolve(false);
                return;
            }
            if (!s.started) {
                //更新启动时间并开始启动
                s.spiderModel.last_run = new Date().toISOString();
                s.once("start", () => { resolve(true); })
                s.once("error", () => { resolve(false); })
                s.start()
            }
            else {
                resolve(false);
            }
        }).catch(() => { });
    }


    //deal all log from child_process to web
    async logDispatch(instance, level, data) {
        //保存到数据库中
        const time = new Date();
        this.send({
            type: "add_log",
            name: instance.fileName,
            level,
            data: `[${time.toLocaleString()}] [${level}] - ${data}`,
        })
        await instance.logModel.create({ level, data, time });
    }

    //send script log to web
    async getLog(name) {
        let res = find(this.mission, { fileName: name })
        if (!res) return [];
        const logs = res.logModel;
        const list = await logs.findAll();
        return list.map((e) => {
            return { level: e.level, data: `[${e.time.toLocaleString()}] [${e.level}] - ${e.data}` };
        })
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
        case "stop_spider":
            return dd.stopSpider(parma);
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