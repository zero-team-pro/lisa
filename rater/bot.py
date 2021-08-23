import rate_artifact as ra
import translations as tr

import asyncio
import io
import os
import sys
import traceback
import validators
import requests
import base64
import pytesseract
import cv2
import numpy as np
import re

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from dotenv import load_dotenv
from signal import SIGINT, SIGTERM

load_dotenv()
# TODO
MAIN_CHANNEL_ID = int(os.getenv('MAIN_CHANNEL_ID', 0))
DATABASE_URL = os.getenv('DATABASE_URL')

RETRIES = 1
MAX_CRASHES = 10
RATE_LIMIT_N = 5
RATE_LIMIT_TIME = 10

calls = 0
crashes = 0
started = False
running = False


def json(**kwargs):
    return kwargs

def to_text(text):
    return json(status='error', text=text)

def to_json(**kwargs):
    embed = json(status='ok', fields=[], **kwargs)
    return embed

def to_image(image, text):
    return json(status='image', image=image, text=text)


def create_opt_to_key(lang):
    return {'hp': lang.hp, 'atk': lang.atk, 'atk%': f'{lang.atk}%', 'er': f'{lang.er}%', 'em': lang.em,
            'phys': f'{lang.phys}%', 'cr': f'{lang.cr}%', 'cd': f'{lang.cd}%', 'elem': f'{lang.elem}%',
            'hp%': f'{lang.hp}%', 'def%': f'{lang.df}%', 'heal': f'{lang.heal}%', 'def': lang.df, 'lvl': lang.lvl}

def create_opt_to_key_all(lang):
    return {'hp': lang.hp, 'atk': lang.atk, 'atk%': f'{lang.atk}%', 'er%': f'{lang.er}%', 'em': lang.em,
            'phys%': f'{lang.phys}%', 'cr%': f'{lang.cr}%', 'cd%': f'{lang.cd}%', 'elem%': f'{lang.elem}%',
            'anemo%': f'{lang.anemo}%', 'electro%': f'{lang.elec}%', 'pyro%': f'{lang.pyro}%',
            'hydro%': f'{lang.hydro}%', 'cryo%': f'{lang.cryo}%', 'geo%': f'{lang.geo}%', 'dendro%': f'{lang.dend}%',
            'hp%': f'{lang.hp}%', 'def%': f'{lang.df}%', 'heal%': f'{lang.heal}%', 'def': lang.df, 'lvl': lang.lvl}


async def rate(ctx, attachmentUrl, raterLang):
    global calls, crashes

    lang = tr.languages[raterLang]

    url = None
    if attachmentUrl:
        url = attachmentUrl

    msg = ctx.split()[1:]

    if msg and msg[0] == 'debug':
        res = requests.get(url)
        img = Image.open(io.BytesIO(res.content))

        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2)
        img = img.convert('L')
        # Image converted to contrast gray

        # PILLOW PREPROCESSING
        threshold = 150
        img = img.point(lambda p: p > threshold and 255)
        #enhancer = ImageEnhance.Contrast(img)
        #img = enhancer.enhance(2)
        #enhancer = ImageEnhance.Sharpness(img)
        #img = enhancer.enhance(300)

        #img = img.filter(ImageFilter.MaxFilter(3))
        #img = img.filter(ImageFilter.MinFilter(3))

        #img = ImageOps.invert(img)

        # CONVERT TO OPENCV
        img = img.convert('RGB')
        cvi = np.array(img)
        cvi = cv2.cvtColor(cvi, cv2.COLOR_RGB2BGR)
        cvi_orig = cvi.copy()

        # OPENCV
        #cvi = cv2.resize(cvi, None, fx=3, fy=3)

        # CONVERT TO BLACK ON WHITE

        gray = cv2.cvtColor(cvi, cv2.COLOR_BGR2GRAY)

        ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV)
        rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 5))
        dilation = cv2.dilate(thresh, rect_kernel, iterations = 1)
        contours, hierarchy = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # CONVERT RECTANGLES
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)

            cropped = cvi[y:y + h, x:x + w]

            avg_per_row = np.average(cropped, axis=0)
            avg = np.average(avg_per_row, axis=0)[0]

            if avg < 120:
                cropped = cv2.bitwise_not(cropped)
                cvi[y:y + h, x:x + w] = cropped
                cvi_orig[y:y + h, x:x + w] = cropped

            cv2.rectangle(cvi_orig, (x, y), (x + w, y + h), (255, 0, 255), 1)

        # PROCESS PREPARED CANVAS

        gray = cv2.cvtColor(cvi, cv2.COLOR_BGR2GRAY)

        ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV)
        #ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU)
        #ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV)
        #thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 10))

        dilation = cv2.dilate(thresh, rect_kernel, iterations = 1)

        contours, hierarchy = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # CONVERT RECTANGLES
        cvt = f'Rects: {str(len(contours))}\n'
        for cnt in reversed(contours):
            x, y, w, h = cv2.boundingRect(cnt)
            if h > 50:
                continue
            cv2.rectangle(cvi_orig, (x, y), (x + w, y + h), (0, 255, 0), 2)

            cropped = cvi[y:y + h, x:x + w]

            text = pytesseract.image_to_string(cropped, lang='rus', config="--oem 3 --psm 7")
            if len(text) < 2:
                text = pytesseract.image_to_string(cropped, lang='rus', config="--oem 3 --psm 9")
            #cvt += f'[{str(len(text))}]'

            cvt += text

        cvt = re.sub(r'(\n\s*)+\n+', '\n\n', cvt)
        cvt = re.sub('[.*\[\]]', '', cvt)

        # CONVERT TO PILLOW
        cvi_orig = cv2.cvtColor(cvi_orig, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(cvi_orig)

        # SEND IMAGE AND TEXT
        buffered = io.BytesIO()
        img.save(buffered, format='PNG')
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        answer = to_image(img_str, cvt)

        return answer

    options = []
    for word in msg:
        if not url and validators.url(word):
            url = word
            if '.' not in url.split('?')[0].split('/')[-1]:
                if '?' in url:
                    url = '.png?'.join(url.split('?'))
                else:
                    url += '.png'
        elif '=' in word:
            options.append(word)
        else:
            print(f'Error: Could not parse "{ctx}"', file=sys.stderr)
            return to_text(lang.err_parse)

    if not url:
        return to_text(lang.err_not_found)

    opt_to_key = create_opt_to_key(lang)
    try:
        options = {opt_to_key[option.split('=')[0].lower()]: float(option.split('=')[1]) for option in options}
    except:
        print(f'Error: Could not parse "{ctx}"', file=sys.stderr)
        return to_text(lang.err_parse)

    print(url, file=sys.stderr)

    for i in range(RETRIES + 1):
        try:
            calls += 1
            suc, text = await ra.ocr(url, i + 1, lang)
            print('================', file=sys.stderr)
            print(suc, file=sys.stderr)
            print(text, file=sys.stderr)
            print('================', file=sys.stderr)

            if not suc:
                if 'Timed out' in text:
                    text += f', {lang.err_try_again}'
                print(text, file=sys.stderr)
                if i < RETRIES:
                    continue
                return to_text(text)

            level, results = ra.parse(text, lang)
            if lang.lvl in options:
                level = int(options[lang.lvl])
            elif level == None:
                level = 20
            score, main_score, main_weight, sub_score, sub_weight = ra.rate(level, results, options, lang)
            crashes = 0
            break

        except Exception:
            print(f'Uncaught exception\n{traceback.format_exc()}', file=sys.stderr)
            if i < RETRIES:
                continue
            return to_text(lang.err_unknown)

    if not results:
        return to_text(lang.err_unknown)

    if score <= 50:
        color = 'BLUE'
    elif score > 50 and score <= 75:
        color = 'PURPLE'
    else:
        color = 'ORANGE'

    opt_to_key_all = create_opt_to_key_all(lang)
    keys = list(opt_to_key_all.keys())
    values = list(opt_to_key_all.values())

    index = values.index(results[0][0])
    mainStatKey = keys[index]

    stats = []
    for result in results[1:]:
        index = values.index(result[0])
        key = keys[index]
        stats.append({'key': key, 'value': result[1]})

    answer = to_json(color=color, level=f'{level}', msg=msg, \
        score=f'{int(score * (main_weight + sub_weight))} ({score:.2f}%)', \
        mainScore=f'{int(main_score * main_weight)} ({main_score:.2f}%)', \
        subScore=f'{int(sub_score * sub_weight)} ({sub_score:.2f}%)', \
        mainStat={'key': mainStatKey, 'value': results[0][1]}, \
        stats=stats)

    return answer
