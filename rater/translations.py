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

        # text for bot errors
        self.err = 'Error'
        self.err_not_found = 'Error: No image or url found, please make sure they were sent in the same message'
        self.err_parse = 'Error: Command cannot be parsed, please double check the format and spelling'
        self.err_try_again = 'please try again in a few minutes'
        self.err_unknown_ocr = 'Error: OCR failed with unknown error'
        self.err_unknown = 'Unknown error, make sure your language is set (see `-help`) and try using an image from the inventory\'s artifact page'
        self.err_server_only = 'Error: This action can only be performed on servers'


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

        self.err = 'Ошибка'
        self.err_not_found = 'Ошибка: изображение или url не найдены, убедитесь, что отправляете в одном сообщении с командой.'
        self.err_parse = 'Ошибка: команда не распознана. Пожалуйста, проверьте правильность ввода.'
        self.err_try_again = 'Пожалуйста, попробуйте чуть позже.'
        self.err_unknown_ocr = 'Ошибка: неизвестная ошибка распознавания текста.'
        self.err_unknown = 'Неизвестная ошибка, попробуйте использовать изображение из инвентаря/со страницы артефакта. Так же проверьте язык игры и язык рейтера. Меняется через команду `lang ru rater` или `lang en rater`.'
        self.err_server_only = 'Ошибка: Это действие может быть выполнено только на серверах.'


class en(translation):
    pass


languages = {lang.id: lang for lang in [en(), ru()]}
