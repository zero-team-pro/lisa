'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "ai_call", deps: []
 * createTable "ai_owner", deps: []
 * addIndex "ai_call_message_id" to table "ai_call"
 * addIndex "ai_call_owner" to table "ai_call"
 * addIndex "ai_call_owner_type" to table "ai_call"
 * addIndex "ai_owner_owner" to table "ai_owner"
 * addIndex "ai_owner_owner_type" to table "ai_owner"
 *
 **/

var info = {
  revision: 5,
  name: 'ai',
  created: '2023-05-20T09:05:22.884Z',
  comment: '',
};

var migrationCommands = function (transaction) {
  return [
    {
      fn: 'createTable',
      params: [
        'ai_call',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            primaryKey: true,
            autoIncrement: true,
          },
          messageId: {
            type: Sequelize.STRING,
            field: 'messageId',
            allowNull: false,
          },
          owner: {
            type: Sequelize.STRING,
            field: 'owner',
            allowNull: false,
          },
          ownerType: {
            type: Sequelize.STRING,
            field: 'ownerType',
            allowNull: false,
          },
          promptTokens: {
            type: Sequelize.DOUBLE,
            field: 'promptTokens',
            allowNull: false,
          },
          completionTokens: {
            type: Sequelize.DOUBLE,
            field: 'completionTokens',
            allowNull: false,
          },
          totalTokens: {
            type: Sequelize.DOUBLE,
            field: 'totalTokens',
            allowNull: false,
          },
          cost: {
            type: Sequelize.DOUBLE,
            field: 'cost',
            allowNull: false,
          },
          createdAt: {
            type: Sequelize.DATE,
            field: 'createdAt',
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            field: 'updatedAt',
            allowNull: false,
          },
        },
        {
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'createTable',
      params: [
        'ai_owner',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            primaryKey: true,
            autoIncrement: true,
          },
          owner: {
            type: Sequelize.STRING,
            field: 'owner',
            allowNull: false,
          },
          ownerType: {
            type: Sequelize.STRING,
            field: 'ownerType',
            allowNull: false,
          },
          spent: {
            type: Sequelize.DOUBLE,
            field: 'spent',
            defaultValue: 0,
            allowNull: false,
          },
          balance: {
            type: Sequelize.DOUBLE,
            field: 'balance',
            allowNull: false,
          },
          createdAt: {
            type: Sequelize.DATE,
            field: 'createdAt',
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            field: 'updatedAt',
            allowNull: false,
          },
        },
        {
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'addIndex',
      params: [
        'ai_call',
        [
          {
            name: 'messageId',
          },
        ],
        {
          indexName: 'ai_call_message_id',
          name: 'ai_call_message_id',
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'addIndex',
      params: [
        'ai_call',
        [
          {
            name: 'owner',
          },
        ],
        {
          indexName: 'ai_call_owner',
          name: 'ai_call_owner',
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'addIndex',
      params: [
        'ai_call',
        [
          {
            name: 'ownerType',
          },
        ],
        {
          indexName: 'ai_call_owner_type',
          name: 'ai_call_owner_type',
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'addIndex',
      params: [
        'ai_owner',
        [
          {
            name: 'owner',
          },
        ],
        {
          indexName: 'ai_owner_owner',
          name: 'ai_owner_owner',
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'addIndex',
      params: [
        'ai_owner',
        [
          {
            name: 'ownerType',
          },
        ],
        {
          indexName: 'ai_owner_owner_type',
          name: 'ai_owner_owner_type',
          transaction: transaction,
        },
      ],
    },
  ];
};
var rollbackCommands = function (transaction) {
  return [
    {
      fn: 'dropTable',
      params: [
        'ai_call',
        {
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'dropTable',
      params: [
        'ai_owner',
        {
          transaction: transaction,
        },
      ],
    },
  ];
};

module.exports = {
  pos: 0,
  useTransaction: true,
  execute: function (queryInterface, Sequelize, _commands) {
    var index = this.pos;
    function run(transaction) {
      const commands = _commands(transaction);
      return new Promise(function (resolve, reject) {
        function next() {
          if (index < commands.length) {
            let command = commands[index];
            console.log('[#' + index + '] execute: ' + command.fn);
            index++;
            queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
          } else resolve();
        }
        next();
      });
    }
    if (this.useTransaction) {
      return queryInterface.sequelize.transaction(run);
    } else {
      return run(null);
    }
  },
  up: function (queryInterface, Sequelize) {
    return this.execute(queryInterface, Sequelize, migrationCommands);
  },
  down: function (queryInterface, Sequelize) {
    return this.execute(queryInterface, Sequelize, rollbackCommands);
  },
  info: info,
};
