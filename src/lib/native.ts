/**
 * Intégrations natives (app iOS Capacitor). Chaque fonction a un repli web,
 * pour que le même code tourne dans le navigateur.
 */
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

/** Retour haptique de fin de repos (la vibration web n'existe pas sur iPhone). */
export async function nativeRestHaptic(): Promise<boolean> {
  if (!isNative()) return false;
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  await Haptics.notification({ type: NotificationType.Success });
  return true;
}

/**
 * Enregistre un fichier texte et ouvre la feuille de partage iOS
 * (Fichiers, iCloud Drive, AirDrop…). Renvoie `false` hors app native.
 */
export async function nativeShareTextFile(filename: string, content: string, title: string): Promise<boolean> {
  if (!isNative()) return false;
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const written = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title, url: written.uri, dialogTitle: title });
  return true;
}
