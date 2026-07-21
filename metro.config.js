const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// firebase(v9+ 모듈러 SDK)는 package.json의 "exports" 필드로만 서브패스를
// 노출하고 레거시 "main" 필드가 없다. Metro가 이를 해석하려면 명시적으로 켜야 한다.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
