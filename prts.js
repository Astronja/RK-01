import fs from 'fs/promises';

export class PRTS {
    constructor (client) {
        this.posthouse = '1408285577958391922';
        this.discordClient = client;
    }

    async receive (id, data) {
        
    }

    async dispatch (id, data) {
        const path = await this.createBuffer(data);
        const channel = this.discordClient.channels.cache.get(this.posthouse);
        await channel.send({
            content: id,
            files: [
                path
            ]
        });
        await fs.unlink(path);
    }

    async createBuffer(data) {
        let path = './data.json';
        await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
        return path;
    }
}