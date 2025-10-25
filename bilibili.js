import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';

export class Bili {
    constructor(userid) {
        this.userid = userid;
        this.cookies = {
            SESSDATA: '5bf9ec61%2C1771381267%2C51093%2A82CjD28wos2fBtR-7iSk8nJS8aN6Ab6vdQ3DhYa4P36Wo_NxsUW9qQveB8HiGIA83nZc4SVmtxSWhFVUlrMWpTUHRLM2p6UTB6OWhPY19VRDdnVDN5dUc3ZmVVQ0oyd0hDYnlpdk5fWkpKMzhMQnRTbzl5RVhYaEdZMFJmdXFBaEpjVl9Qai1icXRnIIEC',
            _uuid: 'A88B2B5A-E45A-6745-F7DE-D43CF172610EA17124infocs',
            bili_jct: '44fb277f4a25d69ff373a495d03ce408',
            DedeUserID: '551987502',
            DedeUserID__ckMd5: 'd19ce1fced86f021',
            sid: '8p3aste3',
            buvid3: '550511FB-3071-FC5B-B8CF-E9A68B0F501B16949infoc',
            buvid4: '4A0B6D1C-6723-5FD0-034A-E0910DE941C417477-025082210-dErTmYRM2i1JNjENHtIU2g%3D%3D',
            buvid_fp: '8b25f11adc36afad803968a731369f17',
            fingerprint: '08aa79309dc7d0198570a8b8669a6f1d',
        };
        this.recentPostsId = [];
        this.wbiKeys = {};
    }

    async getDynamicDetail(dynamicId) {
        try {
            // Initialize WBI keys if not set
            if (!this.wbiKeys.img_key) {
                await this.initWbiKeys();
            }

            // Generate signed API URL
            const params = {
                host_mid: this.userid,
                timezone: '-480',
                offset: '',
                // Add required parameters:
                platform: 'web',
                web_location: '1550101'
            };

            const signedQuery = this.generateSignature(params);

            const response = await axios.get(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?${signedQuery}`, {
                params: {
                    dynamic_id: dynamicId
                },
                headers: {
                    'Cookie': this.getCookieString(),
                    'Referer': `https://space.bilibili.com/${this.userid}/dynamic`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Origin': 'https://space.bilibili.com',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
            });
            await fs.writeFile('./lastpost.json', JSON.stringify(response.data, null, 2), 'utf8');
            return response.data;
        } catch (error) {
            console.error('Error fetching dynamic detail:', error);
            return null;
        }
    }

    getCookieString() {
        return Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
    }

    async initWbiKeys() {
        try {
            const response = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
                headers: {
                    'Cookie': this.getCookieString(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Origin': 'https://www.bilibili.com',
                    'Referer': 'https://www.bilibili.com/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site'
                },
                timeout: 10000
            });

            if (response.data.code !== 0) {
                console.error('Auth Error Details:', response.data);
                throw new Error(`WBI init failed: ${response.data.message} (code: ${response.data.code})`);
            }

            const wbi_img = response.data.data.wbi_img;
            this.wbiKeys = {
                img_key: wbi_img.img_url.split('/').pop().split('.')[0],
                sub_key: wbi_img.sub_url.split('/').pop().split('.')[0]
            };
        } catch (error) {
            console.error('WBI Key Initialization Failed:', error.message);

            // Detailed troubleshooting
            if (error.response) {
                console.error('API Response:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }

            throw error;
        }
    }

    generateSignature(params) {
        const mixinKeyEncTab = [
            46, 47, 18, 2, 53, 8, 23, 32,
            15, 50, 10, 31, 58, 3, 45, 35,
            27, 43, 5, 49, 33, 9, 42, 19,
            29, 28, 14, 39, 12, 38, 41, 13,
            37, 48, 7, 16, 24, 55, 40, 61,
            26, 17, 0, 1, 60, 51, 30, 4,
            22, 25, 54, 21, 56, 59, 6, 63,
            57, 62, 11, 36, 20, 34, 44, 52
        ];

        const orig = this.wbiKeys.img_key + this.wbiKeys.sub_key;
        const mixinKey = mixinKeyEncTab.map(i => orig[i]).slice(0, 32).join('');

        const signedParams = {
            ...params,
            wts: Math.floor(Date.now() / 1000)
        };

        const query = Object.entries(signedParams)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const w_rid = crypto.createHash('md5')
            .update(query + mixinKey)
            .digest('hex');

        return `${query}&w_rid=${w_rid}`;
    }

    async fetchPost() {
        try {
            // Initialize WBI keys if not set
            if (!this.wbiKeys.img_key) {
                await this.initWbiKeys();
            }

            // Generate signed API URL
            const params = {
                host_mid: this.userid,
                timezone: '-480',
                offset: '',
                // Add required parameters:
                platform: 'web',
                web_location: '1550101'
            };

            const signedQuery = this.generateSignature(params);
            const apiUrl = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${signedQuery}`;

            // Make API request with security headers
            const response = await axios.get(apiUrl, {
                headers: {
                    'Cookie': this.getCookieString(),
                    'Referer': `https://space.bilibili.com/${this.userid}/dynamic`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Origin': 'https://space.bilibili.com',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
                timeout: 15000
            });

            // Handle API errors
            if (response.data.code !== 0) {
                throw new Error(`API Error ${response.data.code}: ${response.data.message}`);
            }

            // Process posts
            const items = response.data?.data?.items || [];
            if (items.length === 0) return null;

            return items;

        } catch (error) {
            console.error('Fetch Error:', error.message);

            // Detailed error diagnostics
            if (error.response && cookieUnexpired) {
                console.error('Bilibili API Response:', {
                    status: error.response.status,
                    code: error.response.data?.code,
                    message: error.response.data?.message
                });
            }

            // Add specific handling for authentication errors
            if ((error.response?.data?.code === -101 || error.message.includes('未登录')) && cookieUnexpired) {
                //await alert(`[-101] Cookies values are expired, refresh them asap.`);
                cookieUnexpired = false;
            }

            return null;
        }
    }

    async newPost() {
        try {
            const posts = await this.fetchPost();
            var maxValue = -1;
            var maxIndex = 0;
            if (posts) {
                posts.forEach((obj, index) => {
                    if (obj['modules']['module_author']['pub_ts'] > maxValue) {
                        maxValue = obj['modules']['module_author']['pub_ts'];
                        maxIndex = index;
                    }
                });
            } else return null;
            
            const sortedIndices = posts
                .map((obj, index) => ({ index, pub_ts: obj.modules.module_author.pub_ts }))
                .sort((a, b) => b.pub_ts - a.pub_ts)
                .map(item => item.index);
            const latestPost = posts[maxIndex];
            let toReturn = true;
            if (!this.recentPostsId.includes(latestPost.id_str) && this.recentPostsId.length > 0) {
                console.log(`New Post Detected: ${latestPost.id_str}`);
            } else {
                toReturn = false;
            }
            this.recentPostsId = [];
            for (var i = 0; i < 5; i++) {
                this.recentPostsId.push(posts[sortedIndices[i]]['id_str']);
            }
            if (toReturn) {
                const dynDetail = await this.getDynamicDetail(latestPost.id_str);
                await fs.writeFile('./lastpost.json', JSON.stringify(dynDetail, null, 2), 'utf8');
                return {
                    post: dynDetail,
                    dynamicId: latestPost.id_str
                };
            } else return undefined;
        } catch (error) {
            console.error('Post Check Failed:', error);
        }
    }
}