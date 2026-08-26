module.exports = {
  name: "close",
  run: async (client, name, code, reason) => {
    if (code && code.toString().includes('ETIMEDOUT')) {
      return;
    }

    client.logger.log(
      `Lavalink ${name}: Closed, Code ${code}, Reason ${reason || "No reason"}`,
      "warn",
    );
  },
};
