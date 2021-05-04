import path from "path"
import fs from "fs"


export function fileNameFullList(_path) {
    _path = path.resolve(_path);
    return fileNameList(_path).map((e) => path.join(_path, e));
}
export function fileNameList(jsonPath) {
    let jsonFiles = [];
    try {
        if (!fs.statSync(jsonPath).isDirectory) {
            return jsonFiles;
        }
    }
    catch (e) {
        return jsonFiles;
    }
    function findJsonFile(filePath) {
        let files = fs.readdirSync(filePath);
        files.forEach(function (item, index) {
            let fPath = path.join(jsonPath, item);
            let stat = fs.statSync(fPath);
            if (stat.isDirectory() === true) {
                findJsonFile(fPath);
            }
            if (stat.isFile() === true) {
                if (path.parse(fPath).ext === ".js") {
                    jsonFiles.push(item);
                }
            }
        });
    }
    findJsonFile(jsonPath);
    return jsonFiles;
}