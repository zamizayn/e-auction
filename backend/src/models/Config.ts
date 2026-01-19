import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export interface ConfigAttributes {
    id?: number;
    maxTeams: number;
    squadSize: number;
    minPremium: number;
    minFemale: number;
    minMale: number;
    totalPurse: number;
    incrementValue: number;
    activeSport: string;
}

export class Config extends Model<ConfigAttributes> implements ConfigAttributes {
    public id!: number;
    public maxTeams!: number;
    public squadSize!: number;
    public minPremium!: number;
    public minFemale!: number;
    public minMale!: number;
    public totalPurse!: number;
    public incrementValue!: number;
    public activeSport!: string;
}

Config.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        maxTeams: {
            type: DataTypes.INTEGER,
            defaultValue: 4,
        },
        squadSize: {
            type: DataTypes.INTEGER,
            defaultValue: 15,
        },
        minPremium: {
            type: DataTypes.INTEGER,
            defaultValue: 4,
        },
        minFemale: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
        },
        minMale: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        totalPurse: {
            type: DataTypes.INTEGER,
            defaultValue: 100000000,
        },
        incrementValue: {
            type: DataTypes.INTEGER,
            defaultValue: 100000,
        },
        activeSport: {
            type: DataTypes.STRING,
            defaultValue: 'Cricket',
        },
    },
    {
        sequelize,
        modelName: 'Config',
        tableName: 'Config', // Match Prisma case if needed, or let Sequelize default
        timestamps: false, // Prisma didn't have updatedAt/createdAt for Config in provided schema, double check?
        // Double check: Config model in schema.prisma had no timestamps.
    }
);
