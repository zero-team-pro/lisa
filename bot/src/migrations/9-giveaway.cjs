'use strict';

var Sequelize = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      // Create giveaway table
      await queryInterface.createTable(
        'giveaway',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          completionType: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          completionDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('now'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('now'),
          },
        },
        { transaction: t },
      );

      await queryInterface.addIndex('giveaway', ['status'], { transaction: t });

      // Create giveaway_user table
      await queryInterface.createTable(
        'giveaway_user',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          userId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          userType: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          giveawayId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'giveaway',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('now'),
          },
        },
        { transaction: t },
      );

      await queryInterface.addIndex('giveaway_user', ['userId'], {
        transaction: t,
      });
      await queryInterface.addIndex('giveaway_user', ['userType'], {
        transaction: t,
      });
      await queryInterface.addIndex('giveaway_user', ['giveawayId'], {
        transaction: t,
      });

      // Create giveaway_prize table
      await queryInterface.createTable(
        'giveaway_prize',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          prize: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          prizeType: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          giveawayId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'giveaway',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          winnerId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'giveaway_user',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('now'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('now'),
          },
        },
        { transaction: t },
      );

      await queryInterface.addIndex('giveaway_prize', ['status'], {
        transaction: t,
      });
      await queryInterface.addIndex('giveaway_prize', ['giveawayId'], {
        transaction: t,
      });
      await queryInterface.addIndex('giveaway_prize', ['winnerId'], {
        transaction: t,
      });
    });
  },

  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('giveaway_prize', { transaction: t });
      await queryInterface.dropTable('giveaway_user', { transaction: t });
      await queryInterface.dropTable('giveaway', { transaction: t });
    });
  },
};
