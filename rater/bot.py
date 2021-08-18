import rate_artifact as ra
import translations as tr

import asyncio
import os
import sys
import traceback
import validators

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
            print(f'Error: Could not parse "{ctx}"')
            return to_text(lang.err_parse)

    if not url:
        return to_text(lang.err_not_found)

    opt_to_key = create_opt_to_key(lang)
    try:
        options = {opt_to_key[option.split('=')[0].lower()]: float(option.split('=')[1]) for option in options}
    except:
        print(f'Error: Could not parse "{ctx}"')
        return to_text(lang.err_parse)

    print(url)
    for i in range(RETRIES + 1):
        try:
            calls += 1
            suc, text = await ra.ocr(url, i + 1, lang)

            if not suc:
                if 'Timed out' in text:
                    text += f', {lang.err_try_again}'
                print(text)
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
            print(f'Uncaught exception\n{traceback.format_exc()}')
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
