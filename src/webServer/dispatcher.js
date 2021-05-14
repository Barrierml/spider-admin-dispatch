import script from "../core/index.js"
import { fileNameFullList } from "../common/uitl.js"
import logger from "../common/logger.js"
import { spidersModel, getLogModel } from "./model.js"

import _ from "lodash";
import emt from "events";

const { find } = _;


//将数据库内的脚本信息于新加载的重新对比
async function reLoad(list, cb) {
    await spidersModel.sync();
    let allSpider = await spidersModel.findAll();
    for (let e of list) {
        let res = find(allSpider, { fileName: e.fileName });
        if (res) {
            await reloadSpider(e, res);
            res.patched = true;
        }
        else {
            await createSpider(e);
        }
    };
    //删除已经消失的实例
    for (let res of allSpider) {
        if (!res.patched) {
            await getLogModel(res.fileName).drop();
            await res.destroy();
        }
    }
    cb && cb();
}

//重载爬虫
async function reloadSpider(e, model) {
    e.spiderModel = model;
    e.logModel = getLogModel(e.fileName);
    await e.logModel.sync()
}



//保存新的爬虫
async function createSpider(e) {
    let model = await spidersModel.create({
        name: e.fileName,
        fileName: e.fileName,
        scheduler: null,
        cpu: e.cpu,
        memory: e.memory,
    })
    e.spiderModel = model;
    e.logModel = getLogModel(e.fileName)
    await e.logModel.sync();
}

//初始化script的一些消息事件与按时执行
function scriptInit(e, self) {
    e.on("close", function () {
        self.send({
            type: "spider_close",
            name: this.fileName,
        })
        dd.sendNextRun(e);
    })
    e.on("start", async function () {
        self.send({
            type: "spider_open",
            name: this.fileName,
        })
        e.spiderModel.last_run = new Date().toUTCString();
        dd.sendNextRun(e);
        await e.spiderModel.save();
    })
    //如果设置的有定时执行则自动创建
    e.spiderModel.scheduler && e.createCron(e.spiderModel.scheduler);
}


//爬虫管理调度器
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

    //初始化
    inited() {
        logger.info("数据库初始化完毕");
        //绑定关闭事件
        const self = this;
        this.mission.forEach((e) => {
            scriptInit(e, this)
        });
    }

    //获取所有爬虫信息
    getSpider() {
        logger.debug("获取全部spider信息");
        return this.mission.map((e) => {
            return {
                name: e.fileName,
                status: e.started ? "运行中" : "已停止",
                rate: e.spiderModel.scheduler,
                last_run: e.spiderModel.last_run,
                next_run: e.scheduleJob && e.scheduleJob.nextInvocation(),
            }
        })
    }

    //获取爬虫详细信息
    getSpiderSetting(name) {
        logger.debug(`获取${name}爬虫详细信息`);
        const s = find(this.mission, { fileName: name });
        if (!s) return false;
        return {
            name: e.spiderModel.name || e.fileName,
        }
    }

    //停止爬虫
    stopSpider(name) {
        logger.debug(`停止${name}爬虫`);
        const s = find(this.mission, { fileName: name });
        if (!s) return false;
        s.stop();
        return true;
    }


    //设置爬虫
    async setSpider({ name, parma }) {
        const s = find(this.mission, { fileName: name });
        if (!s) return false;
        logger.debug(`设置${name}爬虫，${JSON.stringify(parma)}`);
        Object.assign(s.spiderModel, parma || {});
        //更新任务
        await s.spiderModel.save();
        if (parma.scheduler) {
            return s.createCron(parma.scheduler);
        }
        else if (parma.scheduler === "") {
            return s.stopCron();
        }
        this.sendNextRun(s);
    }

    //开启爬虫
    openSpider(name) {
        logger.debug(`开启${name}爬虫`);
        return new Promise((resolve) => {
            const s = find(this.mission, { fileName: name });
            if (!s) {
                resolve(false);
                return;
            }
            if (!s.started) {
                //更新启动时间并开始启动
                s.spiderModel.last_run = new Date().toUTCString();
                s.spiderModel.save();
                s.once("start", () => { resolve(true); })
                s.once("error", () => { resolve(false); })
                s.start()
            }
            else {
                resolve(false);
            }
        });
    }


    //deal all log from child_process to web
    async logDispatch(instance, level, data) {
        //保存到数据库中
        const time = new Date();
        this.send({
            type: "add_log",
            name: instance.fileName,
            level,
            data: { time: time.toUTCString(), level, data },
        })
        await instance.logModel.create({ level, data, time });
    }

    //send script log to web
    async getLog(name) {
        let res = find(this.mission, { fileName: name })
        if (!res) return [];
        const logs = res.logModel;
        const list = await logs.findAll({ limit: 20 });
        return list.map((e) => {
            return { level: e.level, data: e.data, time: e.time };
        })
    }


    //发送消息
    send(res) {
        this.ws && this.ws.send(JSON.stringify({ type: "set", res }))
    }


    //更新最后运行与下次运行时间
    sendNextRun(e) {
        this.send({
            type: "update_spider",
            name: e.fileName,
            data: {
                next_run: e.scheduleJob ? e.scheduleJob.nextInvocation() : undefined,
                last_run: e.spiderModel.last_run,
            }
        })
    }
}

const dd = new scriptDispatcher("C:\\Users\\Administrator\\Desktop\\develop\\splier-admin\\dispatcher\\spiders");
export default dd;