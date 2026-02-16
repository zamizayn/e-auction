
import { sequelize } from './db';
import { Config } from './models/Config';

async function testUpdate() {
    try {
        await sequelize.authenticate();
        let config = await Config.findOne();
        if (!config) {
            console.log('No config found');
            return;
        }
        console.log('Initial Config:', config.toJSON());

        const newPrice = 333333;
        await Config.update({ premiumBasePrice: newPrice }, { where: { id: config.id } });

        let updated = await Config.findByPk(config.id);
        console.log('Updated Config:', updated?.toJSON());

        if (updated?.premiumBasePrice === newPrice) {
            console.log('UPDATE SUCCESSFUL');
        } else {
            console.log('UPDATE FAILED');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
testUpdate();
