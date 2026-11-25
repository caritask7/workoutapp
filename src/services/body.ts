import type { BodyMeasurement, IsoDate, ProgressPhoto } from "@/types/domain";
import { measurementSchema, type MeasurementInput } from "@/lib/validation/schemas";
import { DataError } from "./data/driver";
import type { ServiceContext } from "./context";
import { newId, nowIso } from "./ids";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function createBodyService({ driver, userId }: ServiceContext) {
  async function listMeasurements(range?: { from?: IsoDate; to?: IsoDate }): Promise<BodyMeasurement[]> {
    return driver.list("body_measurements", {
      range: range ? { field: "date", gte: range.from, lte: range.to } : undefined,
      orderBy: { field: "date" },
    });
  }

  /** Une mesure par jour : une nouvelle saisie à la même date complète l'existante. */
  async function saveMeasurement(input: MeasurementInput, id?: string): Promise<BodyMeasurement> {
    const data = measurementSchema.parse(input);
    let base: BodyMeasurement | null = id ? await driver.get("body_measurements", id) : null;
    if (!base) {
      const sameDay = await driver.list("body_measurements", { where: { date: data.date } });
      base = sameDay[0] ?? null;
    }
    const row: BodyMeasurement = base
      ? {
          ...base,
          date: data.date,
          weightKg: data.weightKg ?? (id ? null : base.weightKg),
          chestCm: data.chestCm ?? (id ? null : base.chestCm),
          armCm: data.armCm ?? (id ? null : base.armCm),
          waistCm: data.waistCm ?? (id ? null : base.waistCm),
          thighCm: data.thighCm ?? (id ? null : base.thighCm),
          bodyFatPct: data.bodyFatPct ?? (id ? null : base.bodyFatPct),
          notes: data.notes || base.notes,
        }
      : { id: newId(), userId, ...data, createdAt: nowIso() };
    await driver.upsert("body_measurements", row);
    return row;
  }

  async function deleteMeasurement(id: string): Promise<void> {
    await driver.remove("body_measurements", id);
  }

  async function listPhotos(): Promise<ProgressPhoto[]> {
    return driver.list("progress_photos", { orderBy: { field: "date" } });
  }

  async function addPhoto(file: Blob, meta: { date: IsoDate; weightKg: number | null; notes?: string }): Promise<ProgressPhoto> {
    if (!file.type.startsWith("image/")) throw new DataError("Le fichier doit être une image.");
    if (file.size > MAX_PHOTO_BYTES) throw new DataError("Image trop lourde (8 Mo maximum).");
    const id = newId();
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "img";
    const storagePath = `photos/${id}.${ext}`;
    await driver.putBlob(storagePath, file);
    const photo: ProgressPhoto = {
      id,
      userId,
      date: meta.date,
      storagePath,
      weightKg: meta.weightKg,
      notes: meta.notes ?? "",
      createdAt: nowIso(),
    };
    try {
      await driver.upsert("progress_photos", photo);
    } catch (err) {
      await driver.removeBlob(storagePath).catch(() => undefined);
      throw err;
    }
    return photo;
  }

  async function photoUrl(photo: ProgressPhoto): Promise<string | null> {
    return driver.getBlobUrl(photo.storagePath);
  }

  async function deletePhoto(id: string): Promise<void> {
    const photo = await driver.get("progress_photos", id);
    if (!photo) return;
    await driver.remove("progress_photos", id);
    await driver.removeBlob(photo.storagePath).catch(() => undefined);
  }

  return { listMeasurements, saveMeasurement, deleteMeasurement, listPhotos, addPhoto, photoUrl, deletePhoto };
}
