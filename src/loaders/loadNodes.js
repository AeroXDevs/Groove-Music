const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const nodeEventsPath = path.join(__dirname, "../events/Node");
  let totalEvents = 0;
  fs.readdirSync(nodeEventsPath).forEach((file) => {
    const event = require(path.join(nodeEventsPath, file));
    client.manager.shoukaku.on(event.name, (...args) =>
      event.run(client, ...args),
    );
    totalEvents++;
  });
  client.logger.log(`Lavalink Node Events Loaded: ${totalEvents}`, "event");
};
