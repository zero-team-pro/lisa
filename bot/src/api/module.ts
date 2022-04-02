import express from 'express';

import { catchAsync } from '../utils';
import { ModuleList } from '../modules';
import { Language, STATIC_URL } from '../constants';
import Translation from '../translation';
import { translationEnglish } from '../localization';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const t = Translation(Language.English);
    type KeyType = keyof typeof translationEnglish;
    type HelpSectionType = keyof typeof translationEnglish.help;

    const result = ModuleList.map((module) => {
      const commandList = module.commandMap.map((command) => {
        const tKey: KeyType = `help.${command.test as HelpSectionType}` as KeyType;
        let help = t(tKey, {
          helpBlock: {
            stats: t('helpBlock.stats'),
          },
        });
        if (help === tKey) {
          help = '';
        }

        return {
          type: command.type,
          title: command.title,
          description: command.description,
          // TODO: To string
          // test: command.test,
          transports: command.transports,
          help,
        };
      });

      return {
        id: module.id,
        title: module.title,
        iconUrl: `${STATIC_URL}/module-icons/${module.id}.png`,
        commandList,
      };
    });

    res.send(result);
  }),
);

export default router;
