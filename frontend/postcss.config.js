// PostCSS-конфиг нужен, чтобы Next прогонял CSS через Tailwind и Autoprefixer.
module.exports = {
  // Список PostCSS-плагинов.
  plugins: {
    // Tailwind генерирует utility-классы из className в app/components.
    tailwindcss: {},
    // Autoprefixer добавляет браузерные префиксы там, где они нужны.
    autoprefixer: {}
  }
};
