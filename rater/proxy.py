from flask import Flask, jsonify, request
import requests
import asyncio
import sys
import os

import bot as bot

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/config', methods=['GET', 'POST'])
async def config():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
        answer = await bot.config(message['content'], message['authorId'], message['guildId'], message['userName'], message['guildName'], message['isAdmin'])
        return jsonify(answer)
    answer = await bot.config('user', None, None)
    return jsonify(answer)

@app.route('/sets', methods=['GET', 'POST'])
async def sets():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
        answer = await bot.sets(message['content'], message['authorId'], message['guildId'], message['userName'], message['guildName'], message['isAdmin'])
        return jsonify(answer)
    answer = await bot.sets('sets', None, None)
    return jsonify(answer)

@app.route('/help', methods=['GET', 'POST'])
async def help():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
        answer = await bot.help(message['content'], message['authorId'], message['guildId'], message['userName'], message['guildName'], message['isAdmin'])
        return jsonify(answer)
    answer = await bot.help('help', None, None)
    return jsonify(answer)

@app.route('/rate', methods=['GET', 'POST'])
async def rate():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
        answer = await bot.rate(message['content'], message['authorId'], message['guildId'], message['userName'], message['guildName'], message['isAdmin'], message['attachmentUrl'])
        return jsonify(answer)
    answer = await bot.rate('rate', None, None)
    return jsonify(answer)


if __name__ == '__main__':
    app.run()
