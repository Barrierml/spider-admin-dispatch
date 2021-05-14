import { Sequelize } from "sequelize";
const { DataTypes } = Sequelize;
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'spider.sqlite',
    logging: false,
})

const spidersModel = sequelize.define("spiders", {
    name: DataTypes.STRING,
    fileName: DataTypes.STRING,
    scheduler: DataTypes.STRING,
    last_run: DataTypes.DATE,
    cpu: DataTypes.FLOAT(2, 2),
    memory: DataTypes.INTEGER,
})


function getLogModel(name) {
    return sequelize.define(name, {
        time: DataTypes.DATE,
        level: DataTypes.STRING,
        data: DataTypes.TEXT,
    })
}


export { spidersModel, getLogModel }