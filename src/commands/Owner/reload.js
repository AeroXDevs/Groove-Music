const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  REST,
  Routes
} = require("discord.js");

module.exports = {
  name: "reload",
  category: "Owner",
  aliases: ["rd", "reloadall", "rdall"],
  description: "Reloads command",
  args: false,
  usage: "<command|all|everything>",
  owner: true,

  slashOptions: [
    {
      name: "target",
      description: "What to reload: command name, 'all' (commands), or 'everything' (commands & events)",
      type: 3,
      required: true
    }
  ],

  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) return;
    const target = interaction.options.getString("target").toLowerCase();
    await this.processReload(interaction, target, client);
  },

  async execute(message, args, client) {
    if (!client.owners.includes(message.author.id)) return;
    const target = args[0]?.toLowerCase();
    if (!target) {
      return message.reply({
        content: `**${client.emoji.warn} Please provide a target: \`<command|all|everything>\`**`
      });
    }
    await this.processReload(message, target, client);
  },

  async processReload(message, target, client) {
    const isInteraction = !!message.applicationId;
    const author = message.author || message.user;

    const reply = async (title, body) => {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder());

      if (body) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
      }

      const payload = {
        components: [container],
        flags: MessageFlags.IsComponentsV2
      };

      if (isInteraction) {
        if (message.deferred || message.replied) return await message.editReply(payload).catch(() => { });
        return await message.reply(payload).catch(() => { });
      }
      return await message.reply(payload).catch(async () => {
        return await message.channel?.send(payload).catch(() => { });
      });
    };

    if (target === "all" || target === "everything") {
      try {
        let stats = { commands: 0, slash: 0, events: 0, others: 0 };

        const clearCache = (dir) => {
          if (!fs.existsSync(dir)) return;
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
              clearCache(fullPath);
            } else if (file.endsWith(".js")) {
              try {
                const resolved = require.resolve(fullPath);
                delete require.cache[resolved];
                stats.others++;
              } catch (e) { }
            }
          }
        };

        const coreDirs = ["schema", "utils", "loaders", "structures", "custom"];
        for (const dir of coreDirs) {
          clearCache(path.join(process.cwd(), "src", dir));
        }

        try {
          const configPath = require.resolve("../../config.js");
          delete require.cache[configPath];
          client.config = require("../../config.js");
          stats.others++;
        } catch (e) { }

        const commandsDir = path.join(process.cwd(), "src/commands");
        client.commands.clear();
        client.slashCommands.clear();
        if (client.aliases) client.aliases.clear();

        const categories = fs.readdirSync(commandsDir);
        for (const category of categories) {
          const catPath = path.join(commandsDir, category);
          if (!fs.lstatSync(catPath).isDirectory()) continue;

          const cmdFiles = fs.readdirSync(catPath).filter(f => f.endsWith(".js"));
          for (const file of cmdFiles) {
            const cmdPath = path.join(catPath, file);
            try {
              const resolved = require.resolve(cmdPath);
              delete require.cache[resolved];
              const command = require(resolved);
              stats.commands++;

              if (command.name) {
                client.commands.set(command.name, command);
                if (command.aliases) {
                  const aliases = Array.isArray(command.aliases) ? command.aliases : [command.aliases];
                  aliases.forEach(alias => client.aliases?.set(alias, command.name));
                }
                if (command.slashExecute || command.slashOptions) {
                  const slashData = {
                    name: command.name,
                    description: command.description || "No description provided",
                    options: command.slashOptions || [],
                    category: command.category,
                    execute: command.execute,
                    slashExecute: command.slashExecute,
                    autocomplete: command.autocomplete,
                    run: command.run,
                    player: command.player,
                    inVoiceChannel: command.inVoiceChannel,
                    sameVoiceChannel: command.sameVoiceChannel,
                    botPerms: command.botPerms,
                    userPerms: command.userPerms,
                    owner: command.owner || false,
                  };
                  client.slashCommands.set(command.name, slashData);
                  stats.slash++;
                }
              }
            } catch (e) {
              console.error(`Error loading command ${file}:`, e);
            }
          }
        }

        const eventDirs = ["Client", "Node", "Players"];
        for (const dir of eventDirs) {
          const evPath = path.join(process.cwd(), `src/events/${dir}`);
          if (fs.existsSync(evPath)) {
            const files = fs.readdirSync(evPath).filter(f => f.endsWith(".js"));
            for (const file of files) {
              try {
                const fullEvPath = require.resolve(path.join(evPath, file));
                delete require.cache[fullEvPath];
                stats.events++;
              } catch (e) { }
            }
          }
        }

        return await reply(
          `${client.emoji.check} **System Reload Successful!**`,
          `${client.emoji.blank}${client.emoji.wickarrow} **Commands:** \` ${stats.commands} \` [Slash: \` ${stats.slash} \`]\n` +
          `${client.emoji.blank}${client.emoji.wickarrow} **Events:** \` ${stats.events} \` \n` +
          `${client.emoji.blank}${client.emoji.wickarrow} **Core Files:** \` ${stats.others} \``
        );

      } catch (err) {
        console.error(err);
        return await reply(`${client.emoji.cross} **Global Reload Failed**`, `\`\`\`js\n${err.message}\`\`\``);
      }
    }

    const command = client.commands.get(target) || client.commands.find(c => c.aliases?.includes(target));
    if (!command) return await reply(`${client.emoji.cross} **Command Not Found**`, `${client.emoji.blank}${client.emoji.wickarrow} Target: \` ${target} \``);

    try {
      const categoryPath = path.join(process.cwd(), "src/commands", command.category);
      const files = fs.readdirSync(categoryPath);
      const fileName = files.find(f => f.toLowerCase() === `${command.name.toLowerCase()}.js`) || `${command.name}.js`;
      const cmdPath = path.resolve(categoryPath, fileName);

      delete require.cache[require.resolve(cmdPath)];
      const newCmd = require(cmdPath);

      if (client.aliases) {
        client.aliases.forEach((val, key) => {
          if (val === command.name) client.aliases.delete(key);
        });
      }

      client.commands.set(newCmd.name, newCmd);

      if (newCmd.aliases) {
        const aliases = Array.isArray(newCmd.aliases) ? newCmd.aliases : [newCmd.aliases];
        aliases.forEach(alias => client.aliases?.set(alias, newCmd.name));
      }

      if (newCmd.slashExecute || newCmd.slashOptions) {
        const slashData = {
          name: newCmd.name,
          description: newCmd.description || "No description provided",
          options: newCmd.slashOptions || [],
          category: newCmd.category,
          execute: newCmd.execute,
          slashExecute: newCmd.slashExecute,
          autocomplete: newCmd.autocomplete,
          run: newCmd.run,
          player: newCmd.player,
          inVoiceChannel: newCmd.inVoiceChannel,
          sameVoiceChannel: newCmd.sameVoiceChannel,
          botPerms: newCmd.botPerms,
          userPerms: newCmd.userPerms,
          owner: newCmd.owner || false,
        };
        client.slashCommands.set(newCmd.name, slashData);
      }

      return await reply(`${client.emoji.check} **Command Reloaded!**`, `${client.emoji.blank}${client.emoji.wickarrow} Command: \` ${newCmd.name} \` \n${client.emoji.blank}${client.emoji.wickarrow} Category: \` ${newCmd.category} \``);
    } catch (err) {
      console.error(err);
      return await reply(`${client.emoji.cross} **Reload Error**`, `\`\`\`js\n${err.message}\`\`\``);
    }
  }
};
