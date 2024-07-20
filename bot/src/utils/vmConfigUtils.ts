import * as fs from 'fs';

import { VMConfig } from '@/types';
import { uuidShort } from '@/utils/uuid';

const configFilePath = '/data/config.json';

const createNew = (): VMConfig => {
  const config: VMConfig = {
    id: uuidShort(),
  };

  fs.writeFileSync(configFilePath, JSON.stringify(config), 'utf-8');
  console.log('Created new configuration file:', configFilePath);

  return config;
};

const checkOrCreate = (): VMConfig => {
  if (!fs.existsSync(configFilePath)) {
    console.log('Config file does not exists. Creating new configuration file...');
    return createNew();
  } else {
    console.log('Config file exists:', configFilePath);
    const configFile = fs.readFileSync(configFilePath);
    const config = JSON.parse(configFile.toString());
    return config as VMConfig;
  }
};

const updateValue = (value: Partial<VMConfig>): VMConfig => {
  const config = checkOrCreate();

  Object.keys(value).map((key) => {
    if (typeof value[key] !== 'undefined') {
      config[key] = value[key];
    }
  });

  fs.writeFileSync(configFilePath, JSON.stringify(config), 'utf-8');
  console.log('Updated configuration file:', configFilePath);

  return config;
};

export const VMConfigUtils = { configFilePath, createNew, checkOrCreate, updateValue };
