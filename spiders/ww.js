import {spawn} from "child_process"
let qq =  spawn("python",["qq.py"]);
qq.stdout.on("data", (data) => {
    console.log("info", (`${data}`));
})
qq.stderr.on("data", (data) => {
    console.log("error", (`${data}`));
})