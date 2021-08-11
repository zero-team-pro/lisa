import rate_artifact as ra
import translations as tr

import asyncio
import discord
import os
import sys
import traceback
import validators

from discord.ext import commands, tasks
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


def get_lang(user_id, guild_id):
    if DATABASE_URL:
        lang = db.get_lang(user_id, guild_id)
        if lang:
            return tr.languages[lang]
    return tr.en()


def get_presets(ctx):
    if DATABASE_URL:
        guild_id = ctx.guild.id if ctx.guild else None
        presets = []
        for preset in db.get_presets(ctx.message.author.id, guild_id):
            if presets and preset.name == presets[-1].name:
                if preset.entry_id == ctx.message.author.id:
                    presets[-1] = preset
                elif presets[-1].entry_id != ctx.message.author.id and preset.entry_id == guild_id:
                    presets[-1] = preset
            else:
                presets.append(preset)
        return presets


async def config(ctx):
    if not DATABASE_URL:
        return

    lang = get_lang(ctx)

    msg = ctx.message.content.split()
    if len(msg) < 3 or (msg[1] == 'preset' and len(msg) < 4) or (msg[1] == 'prefix' and len(msg) > 3):
        return lang.err_parse

    is_server = 'server' in msg[0]
    attr = msg[1]
    val = ' '.join(msg[2:])
    id = ctx.guild.id if is_server else ctx.message.author.id

    if is_server and not ctx.message.author.guild_permissions.administrator:
        return lang.err_admin_only

    if attr == 'lang':
        if val not in tr.languages:
            return lang.err_parse
        db.set_lang(id, val)
        lang = tr.languages[val]
        return lang.set_lang

    elif attr == 'prefix':
        if not is_server:
            return lang.err_server_only
        db.set_prefix(id, val)
        return lang.set_prefix % val

    elif attr == 'preset':
        val = val.split()
        if val[0] == 'delete':
            deleted = []
            for name in val[1:]:
                if db.del_preset(id, name):
                    deleted.append(name)
            if not deleted:
                return lang.no_presets
            return lang.del_preset % ", ".join(deleted)
        else:
            name = val[0]
            command = ' '.join(val[1:])
            for option in command.split():
                if '=' not in option:
                    return lang.err_parse
            db.set_preset(id, name, command)
            return lang.set_preset % (name, command)


async def sets(ctx):
    if not DATABASE_URL:
        return

    lang = get_lang(ctx)
    presets = get_presets(ctx)

    if not presets:
        return lang.no_presets

    embed = discord.Embed(title='Presets', colour=discord.Colour.blue())
    for preset in presets:
        if preset.entry_id == ctx.message.author.id:
            source = ctx.message.author.display_name
        elif ctx.guild and preset.entry_id == ctx.guild.id:
            source = ctx.guild.name
        else:
            source = 'Artifact Rater'
        embed.add_field(name=f'{preset.name} - {source}', value=preset.command, inline=False)
    return embed


# def create_embed(lang):
#     embed = discord.Embed(title=lang.help_title, description=lang.help_description, colour=discord.Colour.red())
#     embed.add_field(name=lang.source, value=lang.github)
#     embed.add_field(name=lang.invite, value=lang.discord)
#     embed.add_field(name=lang.support, value=lang.server)
#     embed.set_footer(text=lang.help_footer)
#     return embed

def create_embed(lang):
    embed = json(title=lang.help_title, description=lang.help_description, color='red')
    return embed


async def help(ctx, user_id, guild_id):
    lang = get_lang(user_id, guild_id)

    command = ctx.split()
    if len(command) > 2 or len(command) == 2 and command[1] not in lang.help_commands:
        return lang.err_parse

    if len(command) == 1:
        embed = create_embed(lang)
        return embed

    elif len(command) == 2:
        help_command = lang.help_commands[command[1]]
        embed = json(title=f'`{help_command[0]}`', description=help_command[1], color='red')
        return embed


def create_opt_to_key(lang):
    return {'hp': lang.hp, 'atk': lang.atk, 'atk%': f'{lang.atk}%', 'er': f'{lang.er}%', 'em': lang.em,
            'phys': f'{lang.phys}%', 'cr': f'{lang.cr}%', 'cd': f'{lang.cd}%', 'elem': f'{lang.elem}%',
            'hp%': f'{lang.hp}%', 'def%': f'{lang.df}%', 'heal': f'{lang.heal}%', 'def': lang.df, 'lvl': lang.lvl}


async def rate(ctx):
    global calls, crashes

    lang = get_lang(ctx)
    presets = get_presets(ctx) or []
    presets = {preset.name: preset.command for preset in presets}

    url = None
    if ctx.message.attachments:
        url = ctx.message.attachments[0].url

    msg = ctx.message.content.split()[1:]
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
            print(f'Error: Could not parse "{ctx.message.content}"')
            return lang.err_parse

    if not url:
        return lang.err_not_found

    if preset:
        options = presets[preset].split() + options

    opt_to_key = create_opt_to_key(lang)
    try:
        options = {opt_to_key[option.split('=')[0].lower()]: float(option.split('=')[1]) for option in options}
    except:
        print(f'Error: Could not parse "{ctx.message.content}"')
        return lang.err_parse

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
                return text

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
            return lang.err_unknown

    if not results:
        return lang.err_unknown

    if score <= 50:
        color = discord.Color.blue()
    elif score > 50 and score <= 75:
        color = discord.Color.purple()
    else:
        color = discord.Color.orange()

    msg = f'\n\n**{results[0][0]}: {results[0][1]}**'
    for result in results[1:]:
        msg += f'\n{result[0]}: {result[1]}'
    msg += f'\n\n**{lang.score}: {int(score * (main_weight + sub_weight))} ({score:.2f}%)**'
    msg += f'\n{lang.main_score}: {int(main_score * main_weight)} ({main_score:.2f}%)'
    msg += f'\n{lang.sub_score}: {int(sub_score * sub_weight)} ({sub_score:.2f}%)'
    msg += f'\n\n{lang.join}'

    embed = discord.Embed(color=color)
    embed.set_author(name=ctx.message.author.display_name, icon_url=ctx.message.author.avatar_url)
    embed.add_field(name=f'{lang.art_level}: {level}', value=msg)

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
