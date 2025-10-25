import { GatewayIntentBits, Client, ChannelType, PermissionsBitField, ActivityType } from "discord.js";
import { Bili } from './bilibili.js';
import { setInterval } from 'timers/promises';
import fs from 'fs/promises';
import { PRTS } from "./prts.js";

export class Croissant {
    constructor(config, dctoken) {
        this.name = 'Croissant';
        this.discordToken = dctoken;
        this.config = config;
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageTyping
            ]
        });
        this.color = 0xff9900
        this.packageURL = '';
    }

    log (message) {
        console.log(`[${this.name}] ${message}`);
    }

    async login() {
        await this.discordClient.login(this.discordToken);
        this.discordClient.once('ready', async (c) => {
            this.log(`Logged in as ${c.user.tag}`);
            const channel = this.discordClient.channels.cache.get(this.config.debugchannel);
            await channel.send(`Listening dynamics of user with buid \`${this.config.buid}\`.`);
            for await (const _ of setInterval(60000)) await this.updateStatus();
        });
        this.discordClient.on('messageCreate', async (message) => {
            if (message.mentions.has(this.discordClient.user) && message.content.includes('about')) {
                await message.reply(await this.about());
            }
            if (message.content.startsWith('!cr')) {
                const text = message.content.replace('!cr', '').trim();
                if (text.startsWith('notice')) {
                    await this.notice(text.replace('notice', '').trim());
                } else if (text.startsWith('refer')) {
                    message.reply(await this.reference(text.replace('refer', '').trim(), message.author.id));
                } else if (text.startsWith('sddyn')) {
                    await this.sendPostWithDynamicId(text.replace('sddyn', '').trim());
                }
            }
        });
    }

    async updateStatus () {
        const latestVersion = Object.keys(this.config.versions)[Object.keys(this.config.versions).length - 1];
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const statusString = `🥐 · v${latestVersion}: ${days}d ${hours}h ${minutes}m`;
        this.discordClient.user.setPresence({
            activities: [{ 
                name: statusString,
                type: ActivityType.Custom 
            }]
        });
    }

    async alert (message) {
        const channel = this.discordClient.channels.cache.get(this.config.debugchannel);
        if (channel) {
            await channel.send(`# <@${this.config.master}> ${message}`);
        }
    }

    async notice (message) {
        for (let item of this.config.channels) {
            const permissions = await this.checkPerm(item.forward);
            const channel = this.discordClient.channels.cache.get(item.forward);
            if (permissions.allPermissions.includes('MentionEveryone')) {
                await channel.send(`## @here ${message}`);
            } else {
                this.log(`Cannot @here or @everyone in the channel with channel ID of ${item.forward}.`);
                await channel.send(`## ${message}`);
            }
        }
    }

    async reference (message, id) {
        if (message == "") {
            return {
                content: "The current reference sheet is shown below:",
                files: [
                    './referencesheet.json'
                ]
            }
        }
        if (id != this.config.master) {
            return "You do not have permission to modify the reference sheet at this moment.";
        }
        let rSheet = JSON.parse(await fs.readFile('./referencesheet.json', 'utf8'));
        if (message == "flush") {
            rSheet['translation'] = {};
            await fs.writeFile('./referencesheet.json', JSON.stringify(rSheet, null, 2), 'utf8');
            return "The translations are all gone!"
        } else if (message.startsWith("delete")) {
            delete rSheet['translation'][message.replace('delete', '').trim()];
            await fs.writeFile('./referencesheet.json', JSON.stringify(rSheet, null, 2), 'utf8');
            return `Translation of "${message.replace('delete', '').trim()}" is deleted from the reference sheet.`
        }
        let elements = message.split('==');
        if (elements[0].trim() == 'event name') {
            rSheet['event']['name'] = elements[1].trim();
            await fs.writeFile('./referencesheet.json', JSON.stringify(rSheet, null, 2), 'utf8');
            return `The current event name is set to: ${elements[1].trim()}`;
        } else if (elements[0].trim() == 'event banner') {
            rSheet['event']['banner'] = elements[1].trim();
            await fs.writeFile('./referencesheet.json', JSON.stringify(rSheet, null, 2), 'utf8');
            return `The current banner name is set to: ${elements[1].trim()}`;
        } else {
            rSheet['translation'][elements[0].trim()] = elements[1].trim();
            await fs.writeFile('./referencesheet.json', JSON.stringify(rSheet, null, 2), 'utf8');
            return `The reference sheet is updated, "${elements[0].trim()}" will refer to "${elements[1].trim()}".`;
        }
    }

    async checkPerm (channelId) {
        const channel = await this.discordClient.channels.fetch(channelId);
    
        // Ensure it's a text-based channel
        if (!channel.isTextBased() || channel.type === ChannelType.DM) {
        throw new Error('Channel is not a guild text channel');
        }
        
        // Get the bot's permissions in this channel
        const botPermissions = channel.permissionsFor(channel.guild.members.me);
        
        // Check specific permissions
        const canSendMessages = botPermissions.has(PermissionsBitField.Flags.SendMessages);
        const canMentionEveryone = botPermissions.has(PermissionsBitField.Flags.MentionEveryone);
        
        return {
        canSendMessages,
        canMentionEveryone,
        allPermissions: botPermissions.toArray()
        };
    }

    async about() { //returns a discord embed
        const versionList = this.config.versions;
        const latestVersion = Object.keys(versionList)[Object.keys(versionList).length - 1];
        const attributions = [
            'Art components - Arknights《明日方舟》',
            'Bilibili Fix - vxbilibili.com',
            'Bilibili - space.bilibili.com/161775300/dynamic',
            'discord.js v14'
        ];
        return {
            embeds: [
                {
                    color: 0xff9900,
                    title: 'Croissant',
                    author: {
                        name: 'Noel A.',
                        icon_url: (await this.discordClient.users.fetch('1023608069063717035')).displayAvatarURL({ format: 'png', dynamic: true })
                    },
                    description: 'Delivers latest ArknightsCN bilibili posts.',
                    thumbnail: {
                        url: 'https://arknights.wiki.gg/images/8/8f/Croissant_icon.png',
                    },
                    fields: [
                        {
                            name: 'Prefix',
                            value: '!cr',
                            inline: true
                        },
                        {
                            name: 'Version',
                            value: latestVersion,
                            inline: true
                        },
                        {
                            name: 'Liscence',
                            value: 'CC BY-NC 4.0',
                            inline: true
                        },
                        {
                            name: 'Version info',
                            value: versionList[latestVersion]
                        },
                        {
                            name: 'Attributions',
                            value: attributions.join('\n')
                        }
                    ]
                }
            ]
        }
    }

    async sendPost (post) {
        const servers = this.config.channels;
        await this.rawPost();
        let result = await this.modifyPost(post);
        if (!result) {
            return;
        } else if (result.embeds[0].description.includes("恭喜") && result.embeds[0].description.includes("中奖")) {
            const debugchannel = this.discordClient.channels.cache.get(this.config.debugchannel);
            await debugchannel.send("Post ignored (type: 中奖通知)");
            return;
        } else {
            const contentType = await this.analyzePostContent(result.embeds[0].description);
            if (contentType.id != 'UNKNOWN' && result.content.includes('Post')) {
                result.content = contentType.message;
                const prts = new PRTS(this.discordClient);
                switch (contentType.id) {
                    case 'NEW_OPERATOR':
                        prts.dispatch('RK-02 UPLOAD_OP_INTRO', { text: result.embeds[0].description, source: result.embeds[0].url });
                        break;
                }
            }
            for (let item of servers) {
                const channel = this.discordClient.channels.cache.get(item.message);
                if (channel) {
                    await channel.send(result);
                    await this.forwardPost(item);
                } else {
                    this.log(`Cannot find the channel with channel ID of ${item.message}.`);
                }
            }
        }
    }

    async forwardPost (server) {
        const messageChannel = await this.discordClient.channels.fetch(server.message);
        if (messageChannel) {
            const messages = await messageChannel.messages.fetch({ limit: 10 }); // Fetch the last 10 messages
            const botMessages = messages.filter(msg => msg.author.id === this.discordClient.user.id); // Filter messages from the bot

            const mostRecentBotMessage = botMessages.first(); // Get the most recent bot message
            if (mostRecentBotMessage) {
                const messageLink = `https://discord.com/channels/${messageChannel.guild.id}/${messageChannel.id}/${mostRecentBotMessage.id}`;
                const forwardChannel = await this.discordClient.channels.fetch(server.forward);
                await forwardChannel.send(`# ${mostRecentBotMessage.content}\n${messageLink}`);
            }
        } else {
            this.log('Channel not found or is not a text channel.');
        }
    }

    async sendPostWithDynamicId (dyn_id) {
        const request = new Bili('');
        const response = await request.getDynamicDetail(dyn_id);
        const object = {
            post: response,
            dynamicId: dyn_id
        }
        this.sendPost(object);
    }

    async analyzePostContent (text) {
        const event = (JSON.parse(await fs.readFile('./referencesheet.json', 'utf8'))).event;
        let lines = text.split('\n');
        if (lines.length >= 3) lines = [lines[0], lines[1], lines[2]];
        for (let item of lines) {
            let string = item;
            if ((string.includes('新增') && string.includes('干员')) || (string.includes('奖励') && string.includes('干员')) || string.includes(event.banner)) {
                return {
                    id: "NEW_OPERATOR",
                    message: "New operator arrival!"
                };
            } else if ((string.includes('新增') && string.includes('服饰')) || (string.includes('奖励') && string.includes('服饰'))) {
                return {
                    id: "NEW_SKIN",
                    message: "New skin arrival!"
                };
            } else if ((string.includes('新增') && string.includes('主题')) || (string.includes('活动') && string.includes('主题'))) {
                return {
                    id: "NEW_THEME",
                    message: "Upcoming theme!" 
                };
            } else if ((string.includes('新增') && string.includes('头像')) || (string.includes('奖励') && string.includes('头像'))) {
                return {
                    id: "NEW_AVATAR",
                    message: "Upcoming profile picture!"
                };
            } else if ((string.includes('新增') && string.includes('家具')) || (string.includes('奖励') && string.includes('家具'))) {
                return {
                    id: "NEW_FURNITURE",
                    message: "Upcoming furniture!"
                };
            } else if ((string.includes('维护') )) {
                return {
                    id: "MAINTENANCE",
                    message: "Maintenance notification"
                };
            } else if ((string.includes('123罗德岛'))) {
                return {
                    id: "RHODES_ISLAND_123",
                    message: "OMG it's 123 Rhodes Island!"
                };
            } else if ((string.includes('中坚甄选'))) {
                return {
                    id: "KERNAL_LOCATING",
                    message: "Kernal locating is coming!"
                };
            } else if ((string.includes('中坚寻访'))) {
                return {
                    id: "KERNAL_BANNER",
                    message: "Upcoming kernal banner!"
                };
            } else if ((string.includes('模组升级'))) {
                return {
                    id: "NEW_MODULE",
                    message: "Upcoming modules!"
                };
            } else if ((string.includes('集成战略'))) {
                return {
                    id: "IS_RELATED",
                    message: "Integrated Strategies related updates"
                };
            } else if ((string.includes('危机合约'))) {
                return {
                    id: "CC_RELATED",
                    message: "Contingency Contract related updates"
                };
            } else if ((string.includes('公开招募'))) {
                return {
                    id: "RECRUITMENT_RELATED",
                    message: "Recruiment related updates"
                };
            } else if ((string.includes('常驻标准寻访'))) {
                return {
                    id: "REGULAR_BANNER",
                    message: "Upcoming regular banner!"
                };
            } else if ((string.includes('新装限时上架'))) {
                return {
                    id: "NEW_SKIN_SERIES",
                    message: "New skin series available!"
                };
            } else if ((string.includes('专辑')) || (string.includes('OST'))) {
                return {
                    id: "NEW_OST",
                    message: "New OST drop!"
                };
            } else if ((string.includes('现已开启！'))) {
                return {
                    id: "EVENT_START",
                    message: "Event is starting!"
                }
            } else if ((string.includes('×'))) {
                return {
                    id: "COLLAB_RELATED",
                    message: "Collaboration related content"
                };
            }
        }
        return {
            id: "UNKNOWN",
            message: "New Post"
        };
    }

    async modifyPost (data) { // Must return in format of a discord embed!
        /* The annotated code below is no more in use since Croissant v1.7
        const header = `**[New post by ${post.author.name}]**\n<t:${post.time}:F>\n`;
        const footer = `\n\n*Original post: https://www.bilibili.com/opus/${post.id}*`;
        const parentUser = await this.discordClient.users.fetch('1023608069063717035');
        const parentAvatar = parentUser.displayAvatarURL({ format: 'png', dynamic: true });
        switch (post.type) {
            case 'text':
                return {
                    content: `New Post by ${post.author.name}`,
                    embeds: [
                        {
                            color: 0xff9900,
                            title: `New Post by ${post.author.name}`,
                            url: `https://www.bilibili.com/opus/${post.id}`,
                            author: {
                                name: post.author.name,
                                icon_url: post.author.avatar,
                                url: `https://space.bilibili.com/${post.author.id}`
                            },
                            description: post.content.text,
                            timestamp: (new Date(post.time*1000)).toISOString(),
                            footer: {
                                text: 'Content fetched from Bilibili.',
                                icon_url: parentAvatar
                            }
                        }
                    ]
                }
            case 'image':
                return {
                    content: `New Post by ${post.author.name}`,
                    embeds: [
                        {
                            color: 0xff9900,
                            title: `New Post by ${post.author.name}`,
                            url: `https://www.bilibili.com/opus/${post.id}`,
                            author: {
                                name: post.author.name,
                                icon_url: post.author.avatar,
                                url: `https://space.bilibili.com/${post.author.id}`,
                            },
                            description: post.content.text,
                            image: {
                                url: post.content.images[0],
                            },
                            timestamp: (new Date(post.time*1000)).toISOString(),
                            footer: {
                                text: 'Content fetched from Bilibili.',
                                icon_url: parentAvatar
                            }
                        }
                    ]
                }
            case 'video':
                return {
                    content: `New Post by ${post.author.name}`,
                    embeds: [
                        {
                            color: 0xff9900,
                            title: `New Post by ${post.author.name}`,
                            url: `https://www.bilibili.com/opus/${post.id}`,
                            author: {
                                name: post.author.name,
                                icon_url: post.author.avatar,
                                url: `https://space.bilibili.com/${post.author.id}`,
                            },
                            description: post.content.text,
                            fields: [
                                {
                                    name: 'Video',
                                    value: `https://bilibili.com/video/${post.content.bvid}`
                                }
                            ],
                            image: {
                                url: post.content.cover,
                            },
                            timestamp: (new Date(post.time*1000)).toISOString(),
                            footer: {
                                text: 'Content fetched from Bilibili.',
                                icon_url: parentAvatar
                            }
                        }
                    ]
                }
            case 'forward':
                if (post.content.orig.content.text.includes('中奖')) {
                    this.log('Post filtered due to post type: 中奖通知.');
                    return false;
                }
                const contentList = post.content.orig.content.text.split('\n');
                let modifiedContentList = [];
                for (let item of contentList) {
                    modifiedContentList.push(`> ${item}`);
                }
                return {
                    content: `New Post by ${post.author.name}`,
                    embeds: [
                        {
                            color: 0xff9900,
                            title: `New Post by ${post.author.name}`,
                            url: `https://www.bilibili.com/opus/${post.id}`,
                            author: {
                                name: post.author.name,
                                icon_url: post.author.avatar,
                                url: `https://space.bilibili.com/${post.author.id}`,
                            },
                            description: post.content.text,
                            fields: [
                                {
                                    name: `Forward @${post.content.orig.author.name}`,
                                    value: `${modifiedContentList.join('\n')}`
                                }
                            ],
                            timestamp: (new Date(post.time*1000)).toISOString(),
                            footer: {
                                text: 'Content fetched from Bilibili.',
                                icon_url: parentAvatar
                            }
                        }
                    ]
                }
            case 'article':
                return {
                    content: `New Article by ${post.author.name}`,
                    embeds: [
                        {
                            color: 0xff9900,
                            title: `New Article by ${post.author.name}`,
                            url: `https://www.bilibili.com/opus/${post.id}`,
                            author: {
                                name: post.author.name,
                                icon_url: post.author.avatar,
                                url: `https://space.bilibili.com/${post.author.id}`,
                            },
                            description: `# ${post.content.title}\n${post.content.description}`,
                            fields: [
                                {
                                    name: 'Article',
                                    value: `https://www.bilibili.com/read/${post.content.cvid}`
                                }
                            ],
                            timestamp: (new Date(post.time*1000)).toISOString(),
                            footer: {
                                text: 'Content fetched from Bilibili.',
                                icon_url: parentAvatar
                            }
                        }
                    ]
                }
            case 'live':
                let startTime = '';
                if (post.content.start == 'N/A') startTime = '--';
                else startTime = `<t:${post.content.start}:F>`;
                return {
                    content: `New Livestream by ${post.author.name}`,
                    embeds: [
                        {
                            color: 0xff9900,
                            title: `New Livestream by ${post.author.name}`,
                            url: `https://www.bilibili.com/opus/${post.id}`,
                            author: {
                                name: post.author.name,
                                icon_url: post.author.avatar,
                                url: `https://space.bilibili.com/${post.author.id}`,
                            },
                            description: `${post.content.description}`,
                            fields: [
                                {
                                    name: 'Online',
                                    value: `${post.content.online} is watching`,
                                    inline: true
                                },
                                {
                                    name: 'Status',
                                    value: post.content.status,
                                    inline: true
                                },
                                {
                                    name: 'Starting',
                                    value: startTime,
                                    inline: true
                                },
                                {
                                    name: 'Streamroom',
                                    value: post.content.link
                                }
                            ],
                            image: {
                                url: post.content.cover,
                            },
                            timestamp: (new Date(post.time*1000)).toISOString(),
                            footer: {
                                text: 'Content fetched from Bilibili.',
                                icon_url: parentAvatar
                            }
                        }
                    ]
                }
        }

        */

        const parentUser = await this.discordClient.users.fetch('1023608069063717035');
        const parentAvatar = parentUser.displayAvatarURL({ format: 'png', dynamic: true });
        let embed = { 
            color: this.color, 
            title: "New Post by 明日方舟", 
            url: `https://www.bilibili.com/opus/${data.dynamicId}`,
            footer: {
                text: 'Content fetched from Bilibili.', 
                icon_url: parentAvatar
            }
        };
        let message = "";
        const post = JSON.parse(data.post.data.card.card);
        let type = '';
        if (post.title != undefined) {
            if (post.summary != undefined) {
                type = 'article';
                article();
            } else if (post.videos != undefined) {
                type = 'video';
                video();
            } else {
                type = 'unknown';
                await this.alert('Unknown post type.');
                return false;
            }
        } else {
            if (post.origin != undefined) {
                type = 'forward';
                forward();
            } else {
                type = 'dynamic';
                dynamic();
            }
        }

        let result = { content: message, embeds: [embed] }

        return result;

        function dynamic () {
            embed.author = {
                name: post.user.name,
                icon_url: post.user.head_url,
                url: `https://space.bilibili.com/${post.user.uid}/dynamic`,
            };
            embed.description = post.item.description;
            if (post.item.pictures) {
                embed.image = { url: post.item.pictures[0]['img_src'] };
            }
            embed.timestamp = (new Date(post.item.upload_time*1000)).toISOString();
            message = `New Post by ${post.user.name}`;
        }
        function video () {
            embed.author = {
                name: post.owner.name,
                icon_url: post.owner.face,
                url: `https://space.bilibili.com/${post.owner.mid}/dynamic`,
            };
            embed.description = post.dynamic || post.desc;
            embed.image = { url: post.pic };
            embed.timestamp = (new Date(post.pubdate*1000)).toISOString();
            message = `New Video by ${post.owner.name} [▶](https://vxbilibili.com/video/${data.post.data.card.desc.bvid}?lang=en)`;
        }
        function forward () {
            embed.author = {
                name: post.user.uname,
                icon_url: post.user.face,
                url: `https://space.bilibili.com/${post.user.uid}/dynamic`,
            };
            embed.description = post.item.content;
            if (post.item.pictures) {
                embed.image = { url: post.item.pictures[0]['img_src'] };
            }
            // Bilibili does not return unix timestamp when dealing with reposts.
            //embed.timestamp = (new Date(post.item.upload_time*1000)).toISOString();
            embed.fields = [{
                name: "Original Post:",
                value: `> **${post.origin_user.info.uname}**\n> ` + JSON.parse(post.origin).item.description.split('\n').join('\n> ')
            }]
            message = `New Post by ${post.user.uname}`;
        }
        function article () {
            embed.author = {
                name: post.author.name,
                icon_url: post.author.face,
                url: `https://space.bilibili.com/${post.author.mid}/dynamic`,
            };
            embed.description = `**${post.title}**`;
            embed.fields = [{
                name: 'Article content:',
                value: post.summary.split(' ').join('\n')
            }];
            embed.image = { url: post.image_urls[0] };
            embed.timestamp = (new Date(post.publish_time*1000)).toISOString();
            message = `New Article by ${post.author.name}`;
        }
    }

    async rawPost () {
        const channel = this.discordClient.channels.cache.get(this.config.debugchannel);
        await channel.send({ files: [{ attachment: './lastpost.json', name: 'lastpost.json' }] });
        await fs.unlink('./lastpost.json');
    }

    async startLoop () {
        const request = new Bili(this.config.buid);
        for await (const _ of setInterval(this.config.interval)) {
            if (this.config.fetchpackage) {
                try {
                    const packageResponse = await fetch("https://ak.hypergryph.com/downloads/android_lastest");
                    if ((packageResponse.url != this.packageURL) && (this.packageURL != '')) {
                        this.notice("New AKCN package available! Go to https://ak.hypergryph.com and download the latest version!");
                        this.packageURL = packageResponse.url;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            const response = await request.newPost();
            if (response != undefined) {
                this.sendPost(response);
            }
        }
    }
}