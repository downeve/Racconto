const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;

  console.log(`  • 공증 시작: ${appName}`); // 로그를 추가하여 어디서 멈추는지 확인

  return await notarize({
    tool: 'notarytool',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD, // 이 환경변수 이름 확인!
    teamId: process.env.APPLE_TEAM_ID,
  });
};