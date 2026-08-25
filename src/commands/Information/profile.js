const {
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const emoji = require('../../emojis');

module.exports = {
    name: 'profile',
    aliases: ['pr'],
    description: "Displays your custom bot profile image.",
    category: 'Information',
    slashOptions: [
        {
            name: 'user',
            description: 'The user whose profile you want to see',
            type: 6,
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        const user = interaction.options.getUser('user') || interaction.user;
        const messageMock = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            mentions: {
                users: new Map([[user.id, user]])
            },
            reply: async (options) => {
                if (interaction.deferred) return interaction.editReply(options);
                if (interaction.replied) return interaction.followUp(options);
                return interaction.reply(options);
            }
        };
        return this.execute(messageMock, [user.id], client);
    },

    async execute(message, args, client) {
        let user;
        try {
            user = message.mentions?.users?.first()
                || (args[0] && await client.users.fetch(args[0]).catch(() => null))
                || message.author;
        } catch { user = message.author; }

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        const presence = member?.presence;
        const status = presence?.status || 'offline';
        const isStreaming = presence?.activities?.some(a => a.type === 1) || false;

        const statusColors = {
            online: '#3ba55d',
            idle: '#faa61a',
            dnd: '#ed4245',
            offline: '#747f8d',
            streaming: '#593695'
        };
        const activeStatus = isStreaming ? 'streaming' : status;
        const statusColor = statusColors[activeStatus] || statusColors.offline;

        const profileData = client.db.profiles.get(user.id);
        const likedData = client.db.liked.get(user.id);
        const npData = client.db.noprefix.getGlobal(user.id);

        const dbRank = profileData?.rank ?? "User";
        const rank = dbRank;

        const bio = profileData?.bio ?? "No bio is set.";
        const hasNp = !!npData && (!npData.expiresAt || new Date(npData.expiresAt).getTime() > Date.now());

        let avatarImg;
        try {
            const res = await axios.get(user.displayAvatarURL({ extension: 'png', size: 512 }), { responseType: 'arraybuffer', timeout: 5000 });
            avatarImg = await loadImage(Buffer.from(res.data));
        } catch {
            const fallback = createCanvas(200, 200);
            const c = fallback.getContext('2d');
            c.fillStyle = '#111'; c.fillRect(0, 0, 200, 200);
            avatarImg = await loadImage(fallback.toBuffer());
        }

        const width = 1000;
        const height = 562;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = "#030303";
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(500, 281, 0, 500, 281, 600);
        glow.addColorStop(0, "rgba(0, 255, 106, 0.08)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 50) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
        }
        for (let j = 0; j < height; j += 50) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
        }

        const leftX = 60;
        const topY = 60;

        ctx.save();
        drawRoundedRect(ctx, leftX, topY, 140, 140, 70);
        ctx.clip();
        ctx.drawImage(avatarImg, leftX, topY, 140, 140);
        ctx.restore();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 4;
        drawRoundedRect(ctx, leftX, topY, 140, 140, 70);
        ctx.stroke();

        const sx = leftX + 120;
        const sy = topY + 120;
        const outerRadius = 18;
        const innerRadius = 12;

        ctx.fillStyle = "#333333";
        ctx.beginPath(); ctx.arc(sx, sy, outerRadius, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = statusColor;

        if (activeStatus === 'dnd') {
            ctx.beginPath(); ctx.arc(sx, sy, innerRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#333333";
            ctx.fillRect(sx - 8, sy - 2, 16, 4);
        } else if (activeStatus === 'idle') {
            ctx.beginPath(); ctx.arc(sx, sy, innerRadius, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath(); ctx.arc(sx - 5, sy - 5, innerRadius, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        } else if (activeStatus === 'offline') {
            ctx.beginPath(); ctx.arc(sx, sy, innerRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#333333";
            ctx.beginPath(); ctx.arc(sx, sy, innerRadius - 4, 0, Math.PI * 2); ctx.fill();
        } else if (activeStatus === 'streaming') {
            ctx.beginPath(); ctx.arc(sx, sy, innerRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#333333";
            ctx.beginPath();
            ctx.moveTo(sx - 3, sy - 5);
            ctx.lineTo(sx + 5, sy);
            ctx.lineTo(sx - 3, sy + 5);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(sx, sy, innerRadius, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = "#FFFFFF";
        let fontSize = 42;
        ctx.font = `bold ${fontSize}px sans-serif`;
        const maxNameWidth = 280;

        while (ctx.measureText(user.username).width > maxNameWidth && fontSize > 20) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px sans-serif`;
        }
        ctx.fillText(user.username, leftX + 165, topY + 45);

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "400 18px sans-serif";
        ctx.fillText(`ID: ${user.id}`, leftX + 165, topY + 75);

        const tokens = bio.split(/(<a?:\w+:\d{17,20}>)/g).filter(t => t !== '');
        const loadedEmojis = new Map();

        const uniqueEmojiIds = [...new Set(bio.match(/\d{17,20}/g) || [])];
        for (const eid of uniqueEmojiIds.slice(0, 5)) {
            try {
                const url = `https://cdn.discordapp.com/emojis/${eid}.png`;
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 2000 });
                const img = await loadImage(Buffer.from(res.data));
                loadedEmojis.set(eid, img);
            } catch (e) {
                console.error(`Bio Emoji Fail: ${eid}`, e.message);
            }
        }

        const emojiSize = 24;
        const maxWidth = 380;
        const lines = [];
        let currentLine = [];
        let currentWidth = 0;

        for (const token of tokens) {
            const match = /<a?:\w+:(\d{17,20})>/.exec(token);
            if (match && loadedEmojis.has(match[1])) {
                const eid = match[1];
                if (currentWidth + emojiSize > maxWidth && currentLine.length > 0) {
                    lines.push({ tokens: currentLine, width: currentWidth });
                    currentLine = []; currentWidth = 0;
                }
                currentLine.push({ type: 'emoji', id: eid });
                currentWidth += emojiSize + 4;
            } else {
                const words = token.split(/(\s+)/);
                for (const word of words) {
                    if (!word) continue;
                    ctx.font = "20px sans-serif";
                    let wordWidth = ctx.measureText(word).width;

                    if (currentWidth + wordWidth > maxWidth) {
                        if (wordWidth > maxWidth) {
                            for (let i = 0; i < word.length; i++) {
                                const char = word[i];
                                const charWidth = ctx.measureText(char).width;
                                if (currentWidth + charWidth > maxWidth) {
                                    lines.push({ tokens: currentLine, width: currentWidth });
                                    currentLine = []; currentWidth = 0;
                                }
                                currentLine.push({ type: 'text', content: char });
                                currentWidth += charWidth;
                            }
                        } else {
                            if (currentLine.length > 0) {
                                lines.push({ tokens: currentLine, width: currentWidth });
                            }
                            currentLine = [{ type: 'text', content: word }];
                            currentWidth = wordWidth;
                        }
                    } else {
                        currentLine.push({ type: 'text', content: word });
                        currentWidth += wordWidth;
                    }
                }
            }
        }
        if (currentLine.length > 0) lines.push({ tokens: currentLine, width: currentWidth });

        const bioRect = { x: leftX, y: topY + 170, w: 420, h: 270 };
        const lineHeight = 30;
        const paddingTop = 30;
        const paddingLeft = 25;

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        drawRoundedRect(ctx, bioRect.x, bioRect.y, bioRect.w, bioRect.h, 25);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.textAlign = "start";
        let startY = bioRect.y + paddingTop + 15;

        lines.slice(0, 10).forEach(line => {
            let startX = bioRect.x + paddingLeft;
            line.tokens.forEach(tok => {
                if (tok.type === 'text') {
                    ctx.fillText(tok.content, startX, startY);
                    startX += ctx.measureText(tok.content).width;
                } else {
                    const img = loadedEmojis.get(tok.id);
                    if (img) {
                        ctx.drawImage(img, startX, startY - 18, emojiSize, emojiSize);
                        startX += emojiSize + 4;
                    }
                }
            });
            startY += lineHeight;
        });
        ctx.textAlign = "start";

        const rightX = 520;

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "32px sans-serif";
        ctx.fillText("Badges", rightX, topY + 12);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rightX, topY + 28);
        ctx.lineTo(width - 60, topY + 28);
        ctx.stroke();

        let bx = rightX;
        let by = topY + 65;

        const badgePriority = {
            'owner': 0,
            'developer': 1,
            'dev': 1,
            'manager': 2,
            'admin': 3,
            'staff': 4,
            'vip': 5,
            'user': 6,
            'no prefix': 7,
            'no prefix access': 7
        };

        const seenHashes = new Set();
        const finalUniqueBadges = [];

        const addToFinal = (rawName, type) => {
            if (!rawName) return;

            let name = rawName;
            if (rawName.includes(':')) {
                const parts = rawName.split(':');
                if (parts.length >= 2) name = parts[1];
            }

            const hash = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (hash === "user" || !hash) return;

            if (!seenHashes.has(hash)) {
                seenHashes.add(hash);
                finalUniqueBadges.push({ name: name, type: type, original: rawName });
            }
        };

        if (rank && rank.toLowerCase().trim() !== "user") {
            addToFinal(rank, 'rank');
        }
        if (hasNp) {
            addToFinal('No Prefix', 'special');
        }
        if (profileData?.badges && Array.isArray(profileData.badges)) {
            profileData.badges.forEach(b => {
                addToFinal(b, 'custom');
            });
        }

        const allBadges = finalUniqueBadges.sort((a, b) => {
            const getPrio = (name) => {
                const low = name.toLowerCase().trim();
                if (badgePriority[low] !== undefined) return badgePriority[low];
                if (low.includes('dev')) return 1;
                if (low.includes('prefix')) return 7;
                if (low.includes('owner')) return 0;
                return 99;
            };
            return getPrio(a.name) - getPrio(b.name);
        });

        const rankColors = {
            'Owner': '#f1c40f',
            'Developer': '#3e8aff',
            'Manager': '#ffcc00',
            'Admin': '#00ff66',
            'Staff': '#9147ff',
            'VIP': '#ff3eff',
            'User': '#ababab',
            'No prefix': '#ff0077'
        };

        for (let i = 0; i < allBadges.length; i++) {
            const b = allBadges[i];

            let cleanName = b.name.charAt(0).toUpperCase() + b.name.slice(1).toLowerCase().trim();
            const bColor = rankColors[cleanName] || "#00FF66";

            const cx = bx + 22.5;
            const cy = by;
            const checkName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

            const emojiStr = emoji[checkName] || emoji[cleanName.toLowerCase()];
            let emojiImg = null;

            if (emojiStr) {
                const emojiId = emojiStr.match(/\d{17,20}/)?.[0];
                if (emojiId) {
                    try {
                        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
                        const res = await axios.get(emojiUrl, { responseType: 'arraybuffer', timeout: 3000 });
                        emojiImg = await loadImage(Buffer.from(res.data));
                    } catch (e) {
                        console.error(`Failed to load emoji for ${checkName}:`, e.message);
                    }
                }
            }

            if (emojiImg) {
                ctx.drawImage(emojiImg, bx + 5, by - 17, 35, 35);
            } else {
                ctx.fillStyle = bColor;
                if (checkName === 'owner') {
                    drawRoundedRect(ctx, cx - 12, cy + 8, 24, 6, 3); ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(cx - 15, cy + 5); ctx.lineTo(cx - 18, cy - 8); ctx.lineTo(cx - 8, cy + 1);
                    ctx.lineTo(cx, cy - 12); ctx.lineTo(cx + 8, cy + 1); ctx.lineTo(cx + 18, cy - 8);
                    ctx.lineTo(cx + 15, cy + 5); ctx.closePath(); ctx.fill();
                } else if (checkName === 'developer') {
                    drawRoundedRect(ctx, cx - 18, cy - 18, 36, 36, 8); ctx.fill();
                    ctx.fillStyle = "#FFFFFF";
                    ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
                    ctx.fillText("</>", cx, cy + 6);
                } else if (checkName === 'vip') {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 18, cy); ctx.lineTo(cx, cy + 18); ctx.lineTo(cx - 18, cy);
                    ctx.closePath(); ctx.fill();
                } else if (checkName === 'noprefix') {
                    drawRoundedRect(ctx, cx - 18, cy - 18, 36, 36, 8); ctx.fill();
                    ctx.strokeStyle = "#FFFFFF";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(cx - 8, cy + 8);
                    ctx.lineTo(cx + 8, cy - 8);
                    ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(cx + 4, cy - 6, 7, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(cx + 4, cy + 10, 11, 8, 0, Math.PI, 0); ctx.fill();
                    ctx.fillStyle = bColor + "AA";
                    ctx.beginPath(); ctx.arc(cx - 8, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(cx - 8, cy + 8, 8, 5, 0, Math.PI, 0); ctx.fill();
                }
            }

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "22px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(cleanName, bx + 60, by + 8);

            by += 65;
        }
        ctx.textAlign = "left";

        const sanitizedName = user.id;
        const tempPath = path.join(process.cwd(), `profile_${sanitizedName}.png`);
        try {
            const buffer = await canvas.encode('png');
            fs.writeFileSync(tempPath, buffer);

            const attachment = new AttachmentBuilder(tempPath, { name: 'profile.png' });
            const container = new ContainerBuilder()
                .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL("attachment://profile.png")
                ));

            await message.reply({ files: [attachment], components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error("UI Update Fail:", error);
        } finally {
            setTimeout(() => { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); }, 5000);
        }
    }
};

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
