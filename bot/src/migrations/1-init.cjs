'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "server", deps: []
 * createTable "admin_user", deps: []
 * createTable "channel", deps: [server]
 * createTable "user", deps: [server]
 * createTable "preset", deps: [server, user]
 * createTable "rater_call", deps: [user]
 * createTable "admin_user_to_server", deps: [admin_user, server]
 * createTable "telegram_user", deps: [admin_user]
 * createTable "telegram_chat", deps: [admin_user]
 * createTable "article", deps: [admin_user, telegram_chat]
 * addIndex "user_discord_id" to table "user"
 * addIndex "rater_call_user_id" to table "rater_call"
 * addIndex "rater_call_time" to table "rater_call"
 * addIndex "admin_user_discord_id" to table "admin_user"
 * addIndex "telegram_user_admin_id" to table "telegram_user"
 * addIndex "telegram_chat_admin_id" to table "telegram_chat"
 * addIndex "article_chat_id" to table "article"
 * addIndex "article_admin_id" to table "article"
 *
 **/

var info = {
    "revision": 1,
    "name": "init",
    "created": "2023-04-09T11:00:23.996Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "createTable",
            params: [
                "server",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true
                    },
                    "prefix": {
                        "type": Sequelize.STRING,
                        "field": "prefix",
                        "allowNull": false,
                        "defaultValue": "+"
                    },
                    "lang": {
                        "type": Sequelize.STRING,
                        "field": "lang",
                        "allowNull": false,
                        "defaultValue": "en"
                    },
                    "raterLang": {
                        "type": Sequelize.STRING,
                        "field": "raterLang",
                        "allowNull": false,
                        "defaultValue": "en"
                    },
                    "mainChannelId": {
                        "type": Sequelize.STRING,
                        "field": "mainChannelId"
                    },
                    "raterEngine": {
                        "type": Sequelize.STRING,
                        "field": "raterEngine",
                        "allowNull": false,
                        "defaultValue": "OCR"
                    },
                    "modules": {
                        "type": Sequelize.ARRAY(Sequelize.STRING),
                        "field": "modules",
                        "allowNull": false,
                        "defaultValue": Sequelize.Array
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
                "admin_user",
                {
                    "id": {
                        "type": Sequelize.INTEGER,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "discordId": {
                        "type": Sequelize.STRING,
                        "field": "discordId"
                    },
                    "role": {
                        "type": Sequelize.STRING,
                        "field": "role",
                        "allowNull": false,
                        "defaultValue": "user"
                    },
                    "lang": {
                        "type": Sequelize.STRING,
                        "field": "lang"
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
                "channel",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true
                    },
                    "serverId": {
                        "type": Sequelize.STRING,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "server",
                            "key": "id"
                        },
                        "name": "serverId",
                        "allowNull": true,
                        "field": "serverId"
                    },
                    "isEnabled": {
                        "type": Sequelize.BOOLEAN,
                        "field": "isEnabled",
                        "allowNull": false,
                        "defaultValue": false
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
                "user",
                {
                    "id": {
                        "type": Sequelize.INTEGER,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "discordId": {
                        "type": Sequelize.STRING,
                        "field": "discordId"
                    },
                    "serverId": {
                        "type": Sequelize.STRING,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "server",
                            "key": "id"
                        },
                        "name": "serverId",
                        "allowNull": true,
                        "field": "serverId"
                    },
                    "isAdmin": {
                        "type": Sequelize.BOOLEAN,
                        "field": "isAdmin",
                        "allowNull": false,
                        "defaultValue": false
                    },
                    "isBlocked": {
                        "type": Sequelize.BOOLEAN,
                        "field": "isBlocked",
                        "allowNull": false,
                        "defaultValue": false
                    },
                    "lang": {
                        "type": Sequelize.STRING,
                        "field": "lang"
                    },
                    "raterLang": {
                        "type": Sequelize.STRING,
                        "field": "raterLang"
                    },
                    "raterLimit": {
                        "type": Sequelize.INTEGER,
                        "field": "raterLimit",
                        "allowNull": false,
                        "defaultValue": 250
                    },
                    "raterEngine": {
                        "type": Sequelize.STRING,
                        "field": "raterEngine"
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
                "preset",
                {
                    "id": {
                        "type": Sequelize.INTEGER,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "name": {
                        "type": Sequelize.STRING,
                        "field": "name",
                        "allowNull": false
                    },
                    "weights": {
                        "type": Sequelize.STRING,
                        "field": "weights",
                        "allowNull": false
                    },
                    "serverId": {
                        "type": Sequelize.STRING,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "server",
                            "key": "id"
                        },
                        "name": "serverId",
                        "allowNull": true,
                        "field": "serverId"
                    },
                    "userId": {
                        "type": Sequelize.INTEGER,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "user",
                            "key": "id"
                        },
                        "name": "userId",
                        "allowNull": true,
                        "field": "userId"
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
                "rater_call",
                {
                    "id": {
                        "type": Sequelize.INTEGER,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "userId": {
                        "type": Sequelize.INTEGER,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "user",
                            "key": "id"
                        },
                        "name": "userId",
                        "field": "userId",
                        "allowNull": false
                    },
                    "rater": {
                        "type": Sequelize.STRING,
                        "field": "rater",
                        "allowNull": true
                    },
                    "time": {
                        "type": Sequelize.DATE,
                        "field": "time",
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
                "admin_user_to_server",
                {
                    "adminUserId": {
                        "type": Sequelize.INTEGER,
                        "unique": "admin_user_to_server_adminUserId_serverId_unique",
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
                    "serverId": {
                        "type": Sequelize.STRING,
                        "unique": "admin_user_to_server_adminUserId_serverId_unique",
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "server",
                            "key": "id"
                        },
                        "primaryKey": true,
                        "name": "serverId",
                        "field": "serverId"
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
                "telegram_user",
                {
                    "id": {
                        "type": Sequelize.BIGINT,
                        "field": "id",
                        "primaryKey": true
                    },
                    "username": {
                        "type": Sequelize.STRING,
                        "field": "username"
                    },
                    "avatarUrlSmall": {
                        "type": Sequelize.STRING,
                        "field": "avatarUrlSmall"
                    },
                    "avatarUrlBig": {
                        "type": Sequelize.STRING,
                        "field": "avatarUrlBig"
                    },
                    "lang": {
                        "type": Sequelize.STRING,
                        "field": "lang"
                    },
                    "adminId": {
                        "type": Sequelize.INTEGER,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "admin_user",
                            "key": "id"
                        },
                        "name": "adminId",
                        "allowNull": true,
                        "field": "adminId"
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
                "telegram_chat",
                {
                    "id": {
                        "type": Sequelize.BIGINT,
                        "field": "id",
                        "primaryKey": true
                    },
                    "type": {
                        "type": Sequelize.STRING,
                        "field": "type",
                        "allowNull": false
                    },
                    "username": {
                        "type": Sequelize.STRING,
                        "field": "username"
                    },
                    "title": {
                        "type": Sequelize.STRING,
                        "field": "title"
                    },
                    "description": {
                        "type": Sequelize.STRING,
                        "field": "description"
                    },
                    "photoUrl": {
                        "type": Sequelize.STRING,
                        "field": "photoUrl"
                    },
                    "lang": {
                        "type": Sequelize.STRING,
                        "field": "lang"
                    },
                    "adminId": {
                        "type": Sequelize.INTEGER,
                        "onUpdate": "CASCADE",
                        "onDelete": "NO ACTION",
                        "references": {
                            "model": "admin_user",
                            "key": "id"
                        },
                        "name": "adminId",
                        "field": "adminId",
                        "allowNull": false
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
                "article",
                {
                    "id": {
                        "type": Sequelize.BIGINT,
                        "field": "id",
                        "primaryKey": true,
                        "autoIncrement": true
                    },
                    "transport": {
                        "type": Sequelize.STRING,
                        "field": "transport",
                        "allowNull": false
                    },
                    "type": {
                        "type": Sequelize.STRING,
                        "field": "type",
                        "allowNull": false,
                        "defaultValue": "Post"
                    },
                    "status": {
                        "type": Sequelize.STRING,
                        "field": "status",
                        "allowNull": false,
                        "defaultValue": "Draft"
                    },
                    "title": {
                        "type": Sequelize.STRING,
                        "field": "title"
                    },
                    "text": {
                        "type": Sequelize.TEXT,
                        "field": "text"
                    },
                    "messageId": {
                        "type": Sequelize.INTEGER,
                        "field": "messageId"
                    },
                    "adminId": {
                        "type": Sequelize.INTEGER,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "admin_user",
                            "key": "id"
                        },
                        "name": "adminId",
                        "field": "adminId",
                        "allowNull": false
                    },
                    "chatId": {
                        "type": Sequelize.BIGINT,
                        "onUpdate": "CASCADE",
                        "onDelete": "CASCADE",
                        "references": {
                            "model": "telegram_chat",
                            "key": "id"
                        },
                        "name": "chatId",
                        "allowNull": true,
                        "field": "chatId"
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
                "user",
                [{
                    "name": "discordId"
                }],
                {
                    "indexName": "user_discord_id",
                    "name": "user_discord_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "rater_call",
                [{
                    "name": "userId"
                }],
                {
                    "indexName": "rater_call_user_id",
                    "name": "rater_call_user_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "rater_call",
                [{
                    "name": "time"
                }],
                {
                    "indexName": "rater_call_time",
                    "name": "rater_call_time",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "admin_user",
                [{
                    "name": "discordId"
                }],
                {
                    "indexName": "admin_user_discord_id",
                    "name": "admin_user_discord_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "telegram_user",
                [{
                    "name": "adminId"
                }],
                {
                    "indexName": "telegram_user_admin_id",
                    "name": "telegram_user_admin_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "telegram_chat",
                [{
                    "name": "adminId"
                }],
                {
                    "indexName": "telegram_chat_admin_id",
                    "name": "telegram_chat_admin_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "article",
                [{
                    "name": "chatId"
                }],
                {
                    "indexName": "article_chat_id",
                    "name": "article_chat_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "article",
                [{
                    "name": "adminId"
                }],
                {
                    "indexName": "article_admin_id",
                    "name": "article_admin_id",
                    "transaction": transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "dropTable",
            params: ["server", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["channel", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["user", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["preset", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["rater_call", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["admin_user", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["admin_user_to_server", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["telegram_user", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["telegram_chat", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["article", {
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
