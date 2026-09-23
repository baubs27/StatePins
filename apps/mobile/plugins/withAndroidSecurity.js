const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAndroidSecurity(config) {
  return withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application?.[0];
    if (application) {
      application.$["android:usesCleartextTraffic"] = process.env.APP_ENV === "production" ? "false" : "true";
      application.$["android:allowBackup"] = "false";
      application.$["android:fullBackupContent"] = "false";
    }
    return result;
  });
};
