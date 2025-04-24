module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 필요한 경우 여기에 추가 플러그인 추가
    ]
  };
};