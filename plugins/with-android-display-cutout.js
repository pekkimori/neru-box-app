const { AndroidConfig, withAndroidStyles } = require('expo/config-plugins');

const CUTOUT_MODE = 'android:windowLayoutInDisplayCutoutMode';

module.exports = function withAndroidDisplayCutout(config) {
  return withAndroidStyles(config, (config) => {
    const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;

    config.modResults = assignStylesValue(config.modResults, {
      add: true,
      parent: getAppThemeGroup(),
      name: CUTOUT_MODE,
      value: 'shortEdges',
      targetApi: '28',
    });

    config.modResults = assignStylesValue(config.modResults, {
      add: true,
      parent: {
        name: 'Theme.App.SplashScreen',
        parent: 'Theme.SplashScreen',
      },
      name: CUTOUT_MODE,
      value: 'shortEdges',
      targetApi: '28',
    });

    return config;
  });
};
