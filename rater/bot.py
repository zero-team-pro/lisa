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
MAIN_CHANNEL_ID = int(os.getenv('MAIN_CHANNEL_ID', 0))
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    import database as db

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
    return json(type='text', text=text)

def to_embed(**kwargs):
    embed = json(type='embed', fields=[], **kwargs)
    return embed

def create_embed(lang):
    embed = to_embed(title=lang.help_title, description=lang.help_description, color='RED')
    return embed

def add_field(embed, **kwargs):
    embed['fields'].append(kwargs)
    return embed


def get_lang(author_id, guild_id):
    if DATABASE_URL:
        lang = db.get_lang(author_id, guild_id)
        if lang:
            return tr.languages[lang]
    return tr.en()


def get_presets(author_id, guild_id):
    if DATABASE_URL:
        presets = []
        for preset in db.get_presets(author_id, guild_id):
            if presets and preset.name == presets[-1].name:
                if preset.entry_id == author_id:
                    presets[-1] = preset
                elif presets[-1].entry_id != author_id and preset.entry_id == guild_id:
                    presets[-1] = preset
            else:
                presets.append(preset)
        return presets


async def config(ctx, author_id, guild_id, user_name, guild_name, administrator):
    if not DATABASE_URL:
        return

    lang = get_lang(author_id, guild_id)

    msg = ctx.split()
    if len(msg) < 3 or (msg[1] == 'preset' and len(msg) < 4) or (msg[1] == 'prefix' and len(msg) > 3):
        return to_text(lang.err_parse)

    is_server = 'server' in msg[0]
    attr = msg[1]
    val = ' '.join(msg[2:])
    id = guild_id if is_server else author_id

    if is_server and not administrator:
        return to_text(lang.err_admin_only)

    if attr == 'lang':
        if val not in tr.languages:
            return to_text(lang.err_parse)
        db.set_lang(id, val)
        lang = tr.languages[val]
        return to_text(lang.set_lang)

    elif attr == 'prefix':
        if not is_server:
            return to_text(lang.err_server_only)
        db.set_prefix(id, val)
        return to_text(lang.set_prefix % val)

    elif attr == 'preset':
        val = val.split()
        if val[0] == 'delete':
            deleted = []
            for name in val[1:]:
                if db.del_preset(id, name):
                    deleted.append(name)
            if not deleted:
                return to_text(lang.no_presets)
            return to_text(lang.del_preset % ", ".join(deleted))
        else:
            name = val[0]
            command = ' '.join(val[1:])
            for option in command.split():
                if '=' not in option:
                    return to_text(lang.err_parse)
            db.set_preset(id, name, command)
            return to_text(lang.set_preset % (name, command))


async def sets(ctx, author_id, guild_id, user_name, guild_name, administrator):
    if not DATABASE_URL:
        return

    lang = get_lang(author_id, guild_id)
    presets = get_presets(author_id, guild_id)

    if not presets:
        return to_text(lang.no_presets)

    embed = to_embed(title='Presets', colour='BLUE')
    for preset in presets:
        if preset.entry_id == author_id:
            source = user_name
        elif guild_id and preset.entry_id == guild_id:
            source = guild_name
        else:
            source = 'Artifact Rater'
        add_field(embed, name=f'{preset.name} - {source}', value=preset.command, inline=False)
    return embed


# def create_embed(lang):
#     embed = discord.Embed(title=lang.help_title, description=lang.help_description, colour=discord.Colour.red())
#     embed.add_field(name=lang.source, value=lang.github)
#     embed.add_field(name=lang.invite, value=lang.discord)
#     embed.add_field(name=lang.support, value=lang.server)
#     embed.set_footer(text=lang.help_footer)
#     return embed


async def help(ctx, author_id, guild_id, user_name, guild_name, administrator):
    lang = get_lang(author_id, guild_id)

    command = ctx.split()
    if len(command) > 2 or len(command) == 2 and command[1] not in lang.help_commands:
        return to_text(lang.err_parse)

    if len(command) == 1:
        embed = create_embed(lang)
        return embed

    elif len(command) == 2:
        help_command = lang.help_commands[command[1]]
        embed = to_embed(title=f'`{help_command[0]}`', description=help_command[1], color='RED')
        return embed


def create_opt_to_key(lang):
    return {'hp': lang.hp, 'atk': lang.atk, 'atk%': f'{lang.atk}%', 'er': f'{lang.er}%', 'em': lang.em,
            'phys': f'{lang.phys}%', 'cr': f'{lang.cr}%', 'cd': f'{lang.cd}%', 'elem': f'{lang.elem}%',
            'hp%': f'{lang.hp}%', 'def%': f'{lang.df}%', 'heal': f'{lang.heal}%', 'def': lang.df, 'lvl': lang.lvl}


async def rate(ctx, author_id, guild_id, user_name, guild_name, administrator, attachmentUrl):
    global calls, crashes

    lang = get_lang(author_id, guild_id)
    presets = get_presets(author_id, guild_id) or []
    presets = {preset.name: preset.command for preset in presets}

    url = None
    if attachmentUrl:
        url = attachmentUrl

    msg = ctx.split()[1:]
    options = []
    preset = None
    for word in msg:
        if not url and validators.url(word):
            url = word
            if '.' not in url.split('?')[0].split('/')[-1]:
                if '?' in url:
                    url = '.png?'.join(url.split('?'))
                else:
                    url += '.png'
        elif word in presets:
            preset = word
        elif '=' in word:
            options.append(word)
        else:
            print(f'Error: Could not parse "{ctx}"')
            return to_text(lang.err_parse)

    if not url:
        return to_text(lang.err_not_found)

    if preset:
        options = presets[preset].split() + options

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

    msg = f'\n\n**{results[0][0]}: {results[0][1]}**'
    for result in results[1:]:
        msg += f'\n{result[0]}: {result[1]}'
    msg += f'\n\n**{lang.score}: {int(score * (main_weight + sub_weight))} ({score:.2f}%)**'
    msg += f'\n{lang.main_score}: {int(main_score * main_weight)} ({main_score:.2f}%)'
    msg += f'\n{lang.sub_score}: {int(sub_score * sub_weight)} ({sub_score:.2f}%)'
    msg += f'\n\n{lang.join}'

    embed = to_embed(color=color)
    add_field(embed, name=f'{lang.art_level}: {level}', value=msg)

    return embed


def make_f(name, lang):
    suffix = f'_{lang.id}'

    async def _f(ctx):
        return lang.deprecated

    return _f


# deprecated
for lang in tr.languages.values():
    _rate = make_f('rate', lang)
    _feedback = make_f('feedback', lang)
