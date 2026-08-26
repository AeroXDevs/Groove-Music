const { EmbedBuilder } = require("discord.js");

module.exports = (color) => {
  class embed extends EmbedBuilder {
    constructor() {
      super({});
      this.setColor(color);
      return this;
    }
    t = (title) => {
      this.setTitle(title);
      return this;
    };
    d = (text) => {
      this.setDescription(text);
      return this;
    };
    thumb = (url) => {
      this.setThumbnail(url);
      return this;
    };
    img = (uri) => {
      this.setImage(uri);
      return this;
    };
    a = (text, icon) => {
      this.setAuthor({ name: text, iconURL: icon });
      return this;
    };
    f = (text, icon) => {
      this.setFooter({ text: text, iconURL: icon });
      return this;
    };
  }
  return embed;
};
