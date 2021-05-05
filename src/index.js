import { spawn } from "child_process"
import log from "log4js"
import emt from "events"
import { parse } from "path"
import pidusage from "pidusage"

export default class script extends emt {
    constructor(opts) {
        super();
        const { file_url, log_level, limited, logger } = opts
        this.fileUrl = file_url;
        this.child_process = null;
        this.fileName = parse(file_url).base;

        //状态
        this.processOut = logger;
        this.logger = log.getLogger(this.fileName);
        this.started = false;
        this.logger.level = log_level || "debug";

        //性能限制
        this.cpu = limited?.cpu || 99;
        this.memory = limited?.memory || 0;
    }


    //日志中心
    log(level, ...info) {
        this.processOut(this.fileName, level, ...info);
        this.logger[level](...info);
    }

    //创建子进程并执行
    start() {
        const c = this.child_process = spawn("node", ["../src/runtime.js", "file://" + this.fileUrl], { stdio: ["ipc"] })
        c.stdout.on("data", (data) => {
            this.log("info", (`${data}`));
        })
        c.stderr.on("data", (data) => {
            this.log("error", (`${data}`));
            this.emit("error", data);
        })
        c.on("message", this.dispatcher.bind(this));
        c.on("close", () => {
            this.clearMonitor();
            this.log("info", (`ID:[${c.pid}]-已关闭`))
            this.started = false;
        })
    }

    stop() {
        this.log("info", (`ID:[${this.child_process.pid}][${this.fileName}]-停止中`));
        this.started = false;
        return this.child_process.kill();
    }

    //消息调度中心
    dispatcher(data) {
        if (data === undefined) return;
        const { type, msg, param } = data;
        if (type === "event") {
            this.emit(msg, param);
        }
        else if (type === "system") {
            if (msg === "start") {
                this.log("info", (`ID:[${this.child_process.pid}]-开始运行`));
                this.started = true;
                this.monitor();
            }
            this.emit(msg);
        }
    }


    //监视进程资源
    monitor() {
        this.monitor_id = setInterval(async () => {
            if (this.started) {
                let res = await pidusage(this.child_process.pid);
                res.memory = (res.memory / 1024 / 1024).toFixed(2);
                res.cpu = (res.cpu).toFixed(2);
                this.log("debug", (`当前进程状态:\n[cpu:${res.cpu}%]\n[memory:${(res.memory)}MB]`));
                if ((this.cpu && res.cpu >= this.cpu) || (this.memory && res.memory >= this.memory)) {
                    this.log("warn", (`ID:[${this.child_process.pid}]超出资源限制，自动关闭！`));
                    this.stop();
                }
            }
            else {
                clearInterval(this.monitor_id);
            }
        }, 2000);
    }



    //清除循环监视
    clearMonitor() {
        clearInterval(this.monitor_id);
    }
}