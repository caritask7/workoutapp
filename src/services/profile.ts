import type { Profile } from "@/types/domain";
import { profileSchema, type ProfileInput } from "@/lib/validation/schemas";
import { DataError } from "./data/driver";
import type { ServiceContext } from "./context";
import { nowIso } from "./ids";

export function createProfileService({ driver, userId }: ServiceContext) {
  async function getProfile(): Promise<Profile | null> {
    return driver.get("profiles", userId);
  }

  async function updateProfile(input: ProfileInput): Promise<Profile> {
    const existing = await getProfile();
    if (!existing) throw new DataError("Profil introuvable.");
    const data = profileSchema.parse(input);
    const next: Profile = {
      ...existing,
      ...data,
      trainingDays: [...data.trainingDays].sort((a, b) => a - b),
      updatedAt: nowIso(),
    };
    await driver.upsert("profiles", next);
    return next;
  }

  return { getProfile, updateProfile };
}
