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

@app.route('/rate', methods=['GET', 'POST'])
async def rate():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
        answer = await bot.rate(message['content'], message['authorId'], message['guildId'], message['userName'], message['guildName'], message['isAdmin'], message['attachmentUrl'], message['lang'])
        return jsonify(answer)
    answer = await bot.rate('rate', None, None)
    return jsonify(answer)


if __name__ == '__main__':
    app.run()
