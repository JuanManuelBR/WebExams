/* eslint-disable n/no-process-env */

import path from 'path';
import dotenv from 'dotenv';
import moduleAlias from 'module-alias';


// Check the env
const NODE_ENV = (process.env.NODE_ENV ?? 'development');

// Configure "dotenv" - gracefully ignore if file doesn't exist (e.g., Railway sets env vars directly)
dotenv.config({
  path: path.join(__dirname, `./config/.env.${NODE_ENV}`),
});

// Configure moduleAlias
if (__filename.endsWith('js')) {
  moduleAlias.addAlias('@src', __dirname + '/dist');
}
