import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './db';
import routes from './routes';
// Import models to ensure they are registered with sequelize
import './models';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize DB and start server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Sync models (alter table to match model)
        await sequelize.sync({ alter: true });
        console.log('Database synced...');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
