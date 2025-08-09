import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./src/loader.mjs', pathToFileURL('./'));
import 'extensionless/register';
