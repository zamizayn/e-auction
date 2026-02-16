
import { sequelize } from './db';
import { Config } from './models/Config';

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Database connected. Syncing...');
        await sequelize.sync({ alter: true });
        console.log('Sync complete.');
        const config = await Config.findOne();
        console.log('Current Config from DB:', config?.toJSON());
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
