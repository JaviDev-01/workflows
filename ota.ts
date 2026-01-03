import { CapacitorUpdater } from '@capgo/capacitor-updater';

export async function checkForUpdates() {
  try {
    const result = await CapacitorUpdater.download({
      url: 'https://github.com/JaviDev-01/Bookmol/releases/latest/download/update.zip',
      version: ''
    });

    if (result.version) {
      await CapacitorUpdater.set(result);
      await CapacitorUpdater.reload();
    }
  } catch (err) {
    console.log('No update available', err);
  }
}
