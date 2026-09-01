export function shouldPromptMoveToApplications({
  isPackaged,
  isTestBuild,
  platform,
  isInApplicationsFolder,
}: {
  isPackaged: boolean;
  isTestBuild: boolean;
  platform: NodeJS.Platform;
  isInApplicationsFolder: boolean;
}): boolean {
  return (
    isPackaged &&
    !isTestBuild &&
    platform === "darwin" &&
    !isInApplicationsFolder
  );
}
