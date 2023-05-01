'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "context", deps: []
 * addIndex "context_module" to table "context"
 * addIndex "context_owner_type" to table "context"
 * addIndex "context_owner" to table "context"
 *
 **/

var info = {
    "revision": 3,
    "name": "context",
    "created": "2023-04-30T19:32:26.869Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "createTable",
            params: [
                "context",
                {
                    "id": {
                        "type": Sequelize.INTEGER,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "owner": {
                        "type": Sequelize.STRING,
                        "field": "owner",
                        "allowNull": false
                    },
                    "ownerType": {
                        "type": Sequelize.STRING,
                        "field": "ownerType",
                        "allowNull": false
                    },
                    "module": {
                        "type": Sequelize.STRING,
                        "field": "module",
                        "allowNull": false
                    },
                    "data": {
                        "type": Sequelize.JSONB,
                        "field": "data",
                        "allowNull": true
                    },
                    "createdAt": {
                        "type": Sequelize.DATE,
                        "field": "createdAt",
                        "allowNull": false
                    },
                    "updatedAt": {
                        "type": Sequelize.DATE,
                        "field": "updatedAt",
                        "allowNull": false
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "context",
                [{
                    "name": "module"
                }],
                {
                    "indexName": "context_module",
                    "name": "context_module",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "context",
                [{
                    "name": "ownerType"
                }],
                {
                    "indexName": "context_owner_type",
                    "name": "context_owner_type",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "context",
                [{
                    "name": "owner"
                }],
                {
                    "indexName": "context_owner",
                    "name": "context_owner",
                    "transaction": transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
        fn: "dropTable",
        params: ["context", {
            transaction: transaction
        }]
    }];
};

module.exports = {
    pos: 0,
    useTransaction: true,
    execute: function(queryInterface, Sequelize, _commands)
    {
        var index = this.pos;
        function run(transaction) {
            const commands = _commands(transaction);
            return new Promise(function(resolve, reject) {
                function next() {
                    if (index < commands.length)
                    {
                        let command = commands[index];
                        console.log("[#"+index+"] execute: " + command.fn);
                        index++;
                        queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                    }
                    else
                        resolve();
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
    up: function(queryInterface, Sequelize)
    {
        return this.execute(queryInterface, Sequelize, migrationCommands);
    },
    down: function(queryInterface, Sequelize)
    {
        return this.execute(queryInterface, Sequelize, rollbackCommands);
    },
    info: info
};
