export default {
  expo: {
    name: "WattWay",
    slug: "WattWay",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        MBXAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      package: "com.nickomahony.WattWay",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
          RNMapboxMapsVersion: "11.7.0",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Show current location on map.",
        },
      ],
      [
        "@youssefhenna/expo-mapbox-navigation",
        {
          accessToken: process.env.MAPBOX_ACCESS_TOKEN,
          mapboxMapsVersion: "11.7.0",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
      mapboxDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
      googlePlacesApiKey: process.env.GOOGLE_API_KEY,
      chargerApiKey: process.env.CHARGER_API_KEY,
      eas: {
        projectId: "5fa79631-a402-4186-b1e8-aa5b62ec5928",
      },
    },
  },
};
