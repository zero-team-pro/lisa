from flask import Flask, jsonify
import asyncio

import bot as bot

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/help', methods=['GET', 'POST'])
async def help():
    answer = await bot.help('help', None, 874549417846382662)
    return jsonify(answer)


if __name__ == '__main__':
    app.run()
