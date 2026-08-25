const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  try {
    const playerEventsPath = path.join(__dirname, "../events/Players");

    if (!fs.existsSync(playerEventsPath)) {
      client.logger.log(`Player events directory not found: ${playerEventsPath}`, "error");
      return;
    }

    const files = fs.readdirSync(playerEventsPath).filter(file => file.endsWith('.js'));

    if (files.length === 0) {
      client.logger.log(`No player event files found in ${playerEventsPath}`, "warn");
      return;
    }

    let totalEvents = 0;
    let failedEvents = 0;

    files.forEach((file) => {
      try {
        const eventPath = path.join(playerEventsPath, file);
        const event = require(eventPath);

        if (!event.name) {
          failedEvents++;
          return;
        }

        if (!event.run || typeof event.run !== 'function') {
          failedEvents++;
          return;
        }

        if (!client.manager) {
          client.logger.log(`Client manager is not initialized. Cannot load player events.`, "error");
          return;
        }

        client.manager.on(event.name, (...args) => event.run(client, ...args));
        totalEvents++;
      } catch (error) {
        failedEvents++;
      }
    });

    client.logger.log(
      `Player Events Loaded: ${totalEvents}/${files.length}`,
      "event"
    );
  } catch (error) {
    client.logger.log(`Error loading player events: ${error.message}`, "error");
  }
};
