'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "outline_server", deps: []
 * createTable "admin_user_to_outline_server", deps: [admin_user, outline_server]
 * addIndex "outline_server_external_id" to table "outline_server"
 *
 **/

var info = {
    "revision": 2,
    "name": "outline-server",
    "created": "2023-04-15T18:28:14.229Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "createTable",
            params: [
                "outline_server",
                {
                    "id": {
                        "type": Sequelize.INTEGER,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "externalId": {
                        "type": Sequelize.STRING,
                        "field": "externalId"
                    },
                    "accessUrl": {
                        "type": Sequelize.STRING,
                        "field": "accessUrl"
                    },
                    "name": {
                        "type": Sequelize.STRING,
                        "field": "name"
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
            fn: "createTable",
            params: [
                "admin_user_to_outline_server",
                {
                    "adminUserId": {
                        "type": Sequelize.INTEGER,
                        "unique": "admin_user_to_outline_server_outlineServerId_adminUserId_unique",
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "admin_user",
                            "key": "id"
                        },
                        "primaryKey": true,
                        "name": "adminUserId",
                        "field": "adminUserId"
                    },
                    "outlineServerId": {
                        "type": Sequelize.INTEGER,
                        "unique": "admin_user_to_outline_server_outlineServerId_adminUserId_unique",
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "outline_server",
                            "key": "id"
                        },
                        "primaryKey": true,
                        "name": "outlineServerId",
                        "field": "outlineServerId"
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
                "outline_server",
                [{
                    "name": "externalId"
                }],
                {
                    "indexName": "outline_server_external_id",
                    "name": "outline_server_external_id",
                    "transaction": transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "dropTable",
            params: ["admin_user_to_outline_server", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["outline_server", {
                transaction: transaction
            }]
        }
    ];
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
