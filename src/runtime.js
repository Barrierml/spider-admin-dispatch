import process from "process"
const scriptUrl = process.argv[2];


export function send(type, msg) {
    process?.send({
        type, msg
    })
}
function init() {
    process.on("exit", function () {
        send("system", "exit")
    })
}
if (scriptUrl) {
    const _module = await import(scriptUrl);
    if (!_module.default) {
        throw Error("请确定你声明了运行函数");
    }
    init();
    send("system", "start");
    const start = _module.default;
    if (typeof start === "function") {
        await start();
    }
    else {
        throw Error("export default must a function");
    }
}
else {
    throw Error("运行runtim，必须输入脚本名！")
}

