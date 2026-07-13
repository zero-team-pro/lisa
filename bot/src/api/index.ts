import admin from './admin';
import auth from './auth';
import channel from './channel';
import mastercard from './mastercard';
import metrics from './metrics';
import module from './module';
import notify from './notify';
import server from './server';
import telegram from './telegram';
import vm from './vm';
import outline from './vpn/outline';
import { createVersionedRouter } from './versioning';

const versioned = (v1: Parameters<typeof createVersionedRouter>[0]['v1']) => createVersionedRouter({ v1 });

const versionedAdmin = versioned(admin);
const versionedAuth = versioned(auth);
const versionedChannel = versioned(channel);
const versionedMastercard = versioned(mastercard);
const versionedModule = versioned(module);
const versionedNotify = versioned(notify);
const versionedOutline = versioned(outline);
const versionedServer = versioned(server);
const versionedTelegram = versioned(telegram);
const versionedVm = versioned(vm);

export {
  metrics,
  versionedAdmin as admin,
  versionedAuth as auth,
  versionedChannel as channel,
  versionedMastercard as mastercard,
  versionedModule as module,
  versionedNotify as notify,
  versionedOutline as outline,
  versionedServer as server,
  versionedTelegram as telegram,
  versionedVm as vm,
};
