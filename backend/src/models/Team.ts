import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';

export interface TeamAttributes {
    id: string;
    name: string;
    purse: number;
    spent: number;
    logo?: string;
    matchesPlayed: number;
    won: number;
    lost: number;
    tie: number;
    points: number;
    nrr: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// id is optional at creation if we let uuid be generated
interface TeamCreationAttributes extends Optional<TeamAttributes, 'id' | 'spent' | 'matchesPlayed' | 'won' | 'lost' | 'tie' | 'points' | 'nrr'> { }

export class Team extends Model<TeamAttributes, TeamCreationAttributes> implements TeamAttributes {
    public id!: string;
    public name!: string;
    public purse!: number;
    public spent!: number;
    public logo?: string;
    public matchesPlayed!: number;
    public won!: number;
    public lost!: number;
    public tie!: number;
    public points!: number;
    public nrr!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Team.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        purse: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        spent: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        matchesPlayed: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        won: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        lost: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        tie: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        nrr: {
            type: DataTypes.FLOAT,
            defaultValue: 0.0,
        },
    },
    {
        sequelize,
        modelName: 'Team',
        tableName: 'Team',
        timestamps: true,
    }
);
