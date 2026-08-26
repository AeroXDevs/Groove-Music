const fs = require("fs");
const path = require("path");
const { localizations } = require("../utils/i18n");

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");
  let totalCommands = 0;

  fs.readdirSync(commandsPath).forEach((dir) => {
    const commandFiles = fs
      .readdirSync(path.join(commandsPath, dir))
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, dir, file));

      client.commands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach((alias) => client.aliases.set(alias, command.name));
      } else if (command.aliases) {
        client.aliases.set(command.aliases, command.name);
      }

      if (command.slashExecute || command.slashOptions) {
        // Slash command text is localized by Discord itself, from the viewer's
        // client language — unlike runtime replies, which follow the server's
        // configured language. Translations are picked up from the locale files
        // under commands.<name>.*, and any language missing a key simply falls
        // back to the English base string.
        const descriptionLocalizations = localizations(`commands.${command.name}.description`);

        const options = (command.slashOptions || []).map((option) => {
          const localized = localizations(`commands.${command.name}.options.${option.name}`);
          return localized
            ? { ...option, description_localizations: localized }
            : option;
        });

        const slashData = {
          name: command.name,
          description: command.description || "No description provided",
          ...(descriptionLocalizations && { description_localizations: descriptionLocalizations }),
          options,
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
      }

      totalCommands++;
    }
  });

  client.logger.log(`Prefix Commands Loaded: ${totalCommands}`, "cmd");
  client.logger.log(`Slash Commands Loaded: ${client.slashCommands.size}`, "cmd");
};
