import type { Metadata } from "next";
import { NutritionScreen } from "@/components/screens/nutrition-screen";

export const metadata: Metadata = { title: "Nutrition" };

export default function Page() {
  return <NutritionScreen />;
}
