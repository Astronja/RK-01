import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();
import { Croissant } from './prototype.js';

async function start (option) {
    let config = JSON.parse(await fs.readFile('./config.json', 'utf8'));
    let token = process.env.token;
    if (option === 'test') {
        config['channels'] = config['testchannels'];
        config['buid'] = config['testbuid'];
        token = process.env.ada;
    }
    const prototype = new Croissant(config, token);
    await prototype.login();
    prototype.startLoop();
}

start();