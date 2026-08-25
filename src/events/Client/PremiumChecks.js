const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const { t, DEFAULT_LANG } = require("../../utils/i18n");

const cleanExpiredPermissions = async (client) => {
  try {
    const now = new Date().toISOString();

    const expiredNoprefix = client.db.noprefix.findExpired(now);

    if (expiredNoprefix.length === 0) {
      return;
    }

    const notifiedUsers = new Set();
    const userIds = [...new Set(expiredNoprefix.map(entry => entry.userId))];

    for (const entry of expiredNoprefix) {
      client.db.noprefix.delete(entry.id);
      console.log(
        `[Handler] Removed expired NoPrefix for user ${entry.userId}${entry.guildId ? ` in guild ${entry.guildId}` : ''}.`
      );
    }

    for (const userId of userIds) {
      if (notifiedUsers.has(userId)) continue;

      try {
        const user = await client.users.fetch(userId);
        if (user) {
          const expiredDisplay = new TextDisplayBuilder()
            .setContent(
t(DEFAULT_LANG, "evt.noPrefixExpired", { e: client.emoji.info })
            );

          const container = new ContainerBuilder()
            .addTextDisplayComponents(expiredDisplay);

          await user.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });

          notifiedUsers.add(userId);
          console.log(
            `[Handler] Notified user ${userId} about NoPrefix expiration.`
          );
        }
      } catch (error) {
        console.warn(
          `[Handler] Could not notify user ${userId}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("[Handler] Error in cleanExpiredPermissions:", error);
  }
};


let cleanupInitialized = false;

const initializeCleanup = (client) => {
  if (!client) {
    console.error(
      "[Handler] Discord client is required to initialize the cleanup handler."
    );
    return;
  }

  if (cleanupInitialized) {
    return;
  }

  cleanupInitialized = true;
  setInterval(() => cleanExpiredPermissions(client), 60 * 1000);
  console.log("[Handler] NoPrefix cleanup handler initialized.");
};


module.exports = initializeCleanup;
