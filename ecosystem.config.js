module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      script: './index.js',
      watch: true,
      ignore_watch: [
        "node_modules",
        "sessions",
        ".wwebjs_auth",
        ".wwebjs_cache",
        "uploads",
      ]
    }
  ]
};
