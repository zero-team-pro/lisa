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

@app.route('/help', methods=['GET', 'POST'])
async def help():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
        answer = await bot.help(message['content'], message['authorId'], message['guildId'])
        return jsonify(answer)
    answer = await bot.help('help', None, None)
    return jsonify(answer)


if __name__ == '__main__':
    app.run()
