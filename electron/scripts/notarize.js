const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') return;

  // 🌟 이 부분을 추가하여 로컬 터미널에서는 공증을 아예 실행하지 않게 만듭니다!
  if (!process.env.CI) {
    console.log('  • 로컬 환경입니다. 공증(Notarization)을 건너뜁니다.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log(`  • 공증 시작: ${appName}`);

  return await notarize({
    tool: 'notarytool',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};