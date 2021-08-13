class translation:
    def __init__(self):
        # 2-digit language code
        self.id = 'en'
        # 3-digit language code
        self.code = 'eng'
        # Unicode flag
        self.flags = ['🇺🇸']
        # Supported by OCR Engine 2
        self.supported = True

        self.SERVER_URL = 'https://discord.gg/2rvxaQWj'
        # self.BOT_URL = 'https://discord.com/api/oauth2/authorize?client_id=874626524261789756&permissions=84992&scope=bot'
        self.BOT_URL = 'https://cdn.shopify.com/s/files/1/0044/4701/0919/products/private-access-only-sign-the-sign-shed.png?v=1622096738'
        self.GITHUB_URL = 'https://github.com/SemperPeritus/Genshin-Artifact-Rater'
        self.SAMPLE_URL = 'https://cdn.discordapp.com/attachments/787533173004173343/790751503475802122/unknown.png'

        # stats as they appear in-game
        self.hp = 'HP'
        self.heal = 'Healing'
        self.df = 'DEF'
        self.er = 'Energy Recharge'
        self.em = 'Elemental Mastery'
        self.atk = 'ATK'
        self.cd = 'CRIT DMG'
        self.cr = 'CRIT Rate'
        self.phys = 'Physical DMG'
        self.elem = 'Elemental DMG'
        self.anemo = 'Anemo DMG'
        self.elec = 'Electro DMG'
        self.pyro = 'Pyro DMG'
        self.hydro = 'Hydro DMG'
        self.cryo = 'Cryo DMG'
        self.geo = 'Geo DMG'
        self.dend = 'Dendro DMG'

        # text that appears below artifact stats (2-piece set)
        self.piece_set = 'Piece Set'

        # lines will be ignored if they're an exact match
        self.ignore = ['in']
        self.replace = {}

        # text for bot messages
        self.lvl = 'Level'
        self.score = 'Gear Score'
        self.main_score = 'Main Stat Rating'
        self.sub_score = 'Substat Rating'
        self.art_level = 'Artifact Level'
        self.join = f'For issues, join the [Artifact Rater Server]({self.SERVER_URL})'
        self.feedback = f'Feedback received, please join {self.SERVER_URL} if you\'d like to add more details'
        self.deprecated = 'Deprecated, please use the `-user lang <lang>` command to set your language'
        self.set_lang = 'Language set to English'
        self.set_prefix = 'Prefix set to %s'
        self.del_preset = 'Preset %s deleted'
        self.set_preset = 'Preset %s set to %s'
        self.no_presets = 'No presets found'

        # text for bot errors
        self.err = 'Error'
        self.err_not_found = 'Error: No image or url found, please make sure they were sent in the same message'
        self.err_parse = 'Error: Command cannot be parsed, please double check the format and spelling'
        self.err_try_again = 'please try again in a few minutes'
        self.err_unknown_ocr = 'Error: OCR failed with unknown error'
        self.err_unknown = 'Unknown error, make sure your language is set (see `-help`) and try using an image from the inventory\'s artifact page'
        self.err_admin_only = 'Error: Only server admins can perform this action'
        self.err_server_only = 'Error: This action can only be performed on servers'

        # help text
        self.help_stats = '`stat` can be one of `hp`, `hp%`, `def`, `def%`, `atk`, `atk%`, `er` (Energy Recharge), `em` (Elemental Mastery), `phys` (Physical DMG), `elem` (Elemental DMG), `cr` (Crit Rate), `cd` (Crit Damage), `heal` (Healing Bonus).'

        self.help_commands = {
            'rate': [
                '-rate <image/url> [preset] [lvl=<level>] [weights]',
                f'''
				Rate an artifact against an optimal 5* artifact. Put the command and image in the same message. Try to use a clear screenshot for the best results.
				If you are on Windows 10, you can use Shift + Windows + S, drag your cursor over the artifact stats and then paste it on discord with Ctrl + V.
				This bot will use default weights (see below) unless you specify your own or select a preset. You can also specify the level you want to compare your artifact to.

				**Default weights**
				ATK%, DMG%, Crit - 1
				ATK, EM, Recharge – 0.5
				Everything else - 0

				**Parameters**
				`image/url`
				The image to be rated, either attached as a file or by putting the url in the message. [Sample]({self.SAMPLE_URL})

				`preset`
				The preset selection of weights to use. See `-presets` for which presets are available, or `-help` for how to set your own.

				`lvl`
				The level of the artifact to compare against, from 0 to 20. Sometimes the auto-detection for level is wrong, use this to correct it.

				`weights`
				The weights to use for rating this artifact. Each weight is of the format `<stat>=<value>`, where `value` is a number between 0 and 1.
				{self.help_stats}

				**Examples**
				`-rate <image> atk%=0 hp=1 er=0.5`
				`-rate <url> support lvl=4`
				'''
            ],

            'feedback': [
                '-feedback <message> [image]',
                'Send direct feedback with up to one image. Use this to send ideas or report errors to help us improve the bot.'
            ],

            'sets': [
                '-sets',
                '''
                View all available presets. Includes personal, server, and default presets.
                This command will display a list containing the name of the preset, where it's from, and the weights it has set.
                '''
            ],

            'lang': [
                '-[user/server] lang <lang>',
                '''
                Set your language for all commands to the 2 letter language code `lang`.
                Artifact Rater will use this language for the images you send in the `-rate` command.

                Languages: English (en), Spanish (es), German (de), French (fr), Portuguese (pt), Polish (pl), Italian (it), Russian (ru), Indonesian (id), Vietnamese (vi), Japanese (ja), Traditional Chinese (tw), Simplified Chinese (cn)
                '''
            ],

            'prefix': [
                '-server prefix <prefix>',
                'Change the bot\'s prefix for this server.'
            ],

            'preset': [
                '-[user/server] preset <name> <weights>',
                f'''
				Create a preset called `name` to use when rating artifacts.
				If you want to check multiple artifacts with the same set of weights, you can use this command to create a preset with the desired weights.
				`weights` will be used in the `-rate` command when the preset is used. `weights` should be in the format `<stat>=<value>`, where `value` is a number between 0 and 1.
				{self.help_stats}

				**Example**
				`-user preset healer hp=0.5 hp%=1 atk%=0`
				`-rate <image> healer`

				`-[user/server] preset delete <names>`

				Delete the presets in `names` (separated by spaces).
				'''
            ]
        }

        self.help_title = 'Artifact Rater Help'

        self.help_description = f'''
		**Commands**

		`{self.help_commands['rate'][0]}`
		Rate your artifact by sending an image of it. See `-help rate` for more details.

		`{self.help_commands['feedback'][0]}`
		{self.help_commands['feedback'][1]}

		`{self.help_commands['sets'][0]}`
		View all available presets.

		`-help <command>`
		Show the help message for that command. Commands: {', '.join([f'`{command}`' for command in self.help_commands])}.

		**Config**

		`-user` changes your personal config. Overrides server default settings.
		`-server` admin-only, changes the server default.

		`{self.help_commands['prefix'][0]}`
		{self.help_commands['prefix'][1]}

		`{self.help_commands['lang'][0]}`
		Set your language for all commands to the 2 letter language code `lang`. You can also use the flag reactions to change languages.

		`{self.help_commands['preset'][0]}`
		Create a preset to be used when rating artifacts. `weights` will be used in the `-rate` command when the preset is used.

		`-[user/server] preset delete <names>`
		Delete presets.
		'''

        self.source = 'Source Code'
        self.invite = 'Bot Invite'
        self.support = 'Support'
        self.github = f'[GitHub]({self.GITHUB_URL})'
        self.discord = f'[Link]({self.BOT_URL})'
        self.server = f'[Discord]({self.SERVER_URL})'

        self.help_footer = 'To change languages click on the corresponding flag below'


class ru(translation):
    def __init__(self):
        super().__init__()

        self.id = 'ru'
        self.code = 'rus'
        self.flags = ['🇷🇺']
        self.supported = False

        self.hp = 'НР'
        self.heal = 'Бонус лечения'
        self.df = 'Защита'
        self.er = 'Восст. энергии'
        self.em = 'Мастерство стихий'
        self.atk = 'Сила атаки'
        self.cd = 'Крит. урон'
        self.cr = 'Шанс крит. попадания'
        self.phys = 'Бонус Физ. урона'
        self.elem = 'Бонус Элем. урона'
        self.anemo = 'Бонус Анемо урона'
        self.elec = 'Бонус Электро урона'
        self.pyro = 'Бонус Пиро урона'
        self.hydro = 'Бонус Гидро урона'
        self.cryo = 'Бонус Крио урона'
        self.geo = 'Бонус Гео урона'
        self.dend = 'Бонус Дендро урона'

        self.piece_set = '2 предмета'

        self.lvl = 'Уровень'
        self.score = 'Общая оценка'
        self.main_score = 'Оценка главного стата'
        self.sub_score = 'Оценка вторичных статов'
        self.art_level = 'Уровень артефакта'
        self.join = f'Если у вас возникли проблемы, присоединяйтесь к [Artifact Rater Server]({self.SERVER_URL})'
        self.feedback = f'Отзыв получен, присоединяйтесь к {self.SERVER_URL} для большей информации.'
        self.deprecated = 'Устарело, пожалуйста испольщуйте команду -user lang <lang>, чтобы выбрать ваш язык'
        self.set_lang = 'Выбран язык: Русский'
        self.set_prefix = 'Префикс %s выбран'
        self.del_preset = 'Шаблон %s удален'
        self.set_preset = 'Шаблон %s изменен на %s'
        self.no_presets = 'Шаблон не найден'

        self.err = 'Ошибка'
        self.err_not_found = 'Ошибка: изображение или url не найдены, убедитесь, что отправляете в одном сообщении с командой.'
        self.err_parse = 'Ошибка: команда не распознана. Пожалуйста, проверьте правильность ввода.'
        self.err_try_again = 'Пожалуйста, попробуйте чуть позже.'
        self.err_unknown_ocr = 'Ошибка: неизвестная ошибка распознавания текста.'
        self.err_unknown = 'Неизвестная ошибка, попробуйте использовать изображение из инвентаря/со страницы артефакта.'
        self.err_admin_only = 'Ошибка: Только админы сервера могут выполнить эту команду.'
        self.err_server_only = 'Ошибка: Это действие может быть выполнено только на серверах.'

        self.help_stats = '`stat` может использоваться для любого показателя: `hp`, `hp%`, `def`, `def%` (Защита), `atk`, `atk%` (Атака), `er` (Восстановление энергии), `em` (Мастерство стихий), `phys` (Физический урон), `elem` (Элементальный урон), `cr` (Крит.Шанс), `cd` (Крит.Урон), `heal` (Лечение бонус).'

        self.help_title = 'Помощь по Artifact Rater боту'

        self.help_description = f'''
		Если вы хотите добавить его на свой сервер, используйте [ссылку]({self.BOT_URL})
		Так же вы можете использовать бота, отправив личное сообщение Artifact Rater#6924.

		`-rate <image/url> [lvl=<Уровень>] [<stat>=<По умолчанию> ...]`
		Оцените свой артефакт относительно идеального 5* артефакта. Отправьте изображение в одном сообщении с командой.
		Если вы используете Windows 10, вы можете зажать Shift + Windows + S и выделить для скриншота артефакт, а затем вставить его в Дискорд с помощью Ctrl+V.

		Оценка по умолчанию:
		Сила атаки %, шанс и урон крита - 1
		Сила атаки, мастерство стихий, восстановление энергии - 0.5
		Всё остальное - 0
		Опции:
		lvl:  Сравнить с указанным уровнем артефакта (по умолчанию: <artifact_level>)
		-rate lvl=20
		<stat>: Настроить значения по умолчанию (от 0 до 1)
		-rate Сила атаки=1 Восст.энергии=0 Сила атаки%=0.5
		{self.help_stats}

		`-feedback <сообщение> [изображение]`
		Отправьте отзыв с проблемами или идеями для бота. Можно добавить одно изображение.
		'''

        self.help_footer = 'Чтобы изменить язык, нажмите на соответствующий флаг ниже'


class en(translation):
    pass


languages = {lang.id: lang for lang in [en(), ru()]}
