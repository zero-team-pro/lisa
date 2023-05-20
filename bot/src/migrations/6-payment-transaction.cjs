'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "payment_transaction", deps: []
 * addIndex "payment_transaction_owner" to table "payment_transaction"
 * addIndex "payment_transaction_owner_type" to table "payment_transaction"
 *
 **/

var info = {
  revision: 6,
  name: 'payment-transaction',
  created: '2023-05-20T16:07:21.309Z',
  comment: '',
};

var migrationCommands = function (transaction) {
  return [
    {
      fn: 'createTable',
      params: [
        'payment_transaction',
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
          amount: {
            type: Sequelize.DOUBLE,
            field: 'amount',
            allowNull: false,
          },
          method: {
            type: Sequelize.STRING,
            field: 'method',
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING,
            field: 'status',
            allowNull: false,
          },
          paymentData: {
            type: Sequelize.STRING,
            field: 'paymentData',
          },
          message: {
            type: Sequelize.STRING,
            field: 'message',
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
        'payment_transaction',
        [
          {
            name: 'owner',
          },
        ],
        {
          indexName: 'payment_transaction_owner',
          name: 'payment_transaction_owner',
          transaction: transaction,
        },
      ],
    },
    {
      fn: 'addIndex',
      params: [
        'payment_transaction',
        [
          {
            name: 'ownerType',
          },
        ],
        {
          indexName: 'payment_transaction_owner_type',
          name: 'payment_transaction_owner_type',
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
        'payment_transaction',
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
