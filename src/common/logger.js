import log4js from "log4js"
const { getLogger } = log4js
const logger = getLogger("spider-admin");
logger.level = "debug";
export default logger;