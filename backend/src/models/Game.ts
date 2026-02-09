import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';

export interface GameAttributes {
    id: string;
    name: string;
    sport: string;
    type: string; // 'Single', 'Team', 'Doubles', 'Mixed Doubles'
    pointsFirst: number;
    pointsSecond: number;
    pointsThird: number;
    createdAt?: Date;
}

interface GameCreationAttributes extends Optional<GameAttributes, 'id' | 'pointsFirst' | 'pointsSecond' | 'pointsThird'> { }

export class Game extends Model<GameAttributes, GameCreationAttributes> implements GameAttributes {
    public id!: string;
    public name!: string;
    public sport!: string; // 'Cricket', 'Football', 'Badminton', etc.
    public type!: string; // 'Single', 'Team', 'Doubles', 'Mixed Doubles'
    public pointsFirst!: number;
    public pointsSecond!: number;
    public pointsThird!: number;

    public readonly createdAt!: Date;
}

Game.init(
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
        sport: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'General'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Team Match'
        },
        pointsFirst: {
            type: DataTypes.INTEGER,
            defaultValue: 2
        },
        pointsSecond: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        pointsThird: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    },
    {
        sequelize,
        modelName: 'Game',
        tableName: 'Game',
        timestamps: true,
        updatedAt: false,
    }
);
