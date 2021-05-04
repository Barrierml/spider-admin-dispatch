import script from "../src/index.js"
import { fileNameFullList } from "../src/uitl.js"
import emt from "events";

//生成任务
function generate(fileName) {
    return new script({
        file_url: fileName,
    })
}


class dispatcher extends emt {
    constructor(dir) {
        super();
        this.dir = dir;
        this.jsList = fileNameFullList(dir);
        this.mission = this.jsList.map(generate);
    }

    getSpider() {
        return this.mission.map((e) => {
            return {
                name: e.fileName,
                status: e.started ? "运行中" : "已停止",
            }
        })
    }
}

const dd = new dispatcher("C:\\Users\\Administrator\\Desktop\\develop\\splier-admin\\dispatcher\\spiders");
export { dd };


function setScript(){

}


export default async function dealwith(data) {
    data = JSON.parse(data);
    console.log("收到消息", data);
    const { type, msg } = data;
    if (type === "get") {
        switch (msg) {
            case "list":
                return { type: "list", msg: dd.getSpider() }
            case "set":
                return await setScript()
        }
    }
}