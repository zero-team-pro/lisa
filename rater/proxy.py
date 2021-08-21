from flask import Flask, jsonify, request
import requests
import asyncio
import sys
import os
import json

import bot as bot

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/rate', methods=['GET', 'POST'])
async def rate():
    if request.method == 'POST' and request.is_json:
        message = request.get_json(silent=True)
#         app.logger.info('content: ' + json.dumps(message['content']))
#         app.logger.info('attachmentUrl: ' + json.dumps(message['attachmentUrl']))
#         app.logger.info('lang: ' + json.dumps(message['lang']))
        answer = await bot.rate(message['content'], message['attachmentUrl'], message['lang'])
        return jsonify(answer)
    answer = await bot.rate('rate', None, None)
    return jsonify(answer)


if __name__ == '__main__':
    app.run()
