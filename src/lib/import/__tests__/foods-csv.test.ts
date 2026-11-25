import { describe, expect, it } from "vitest";
import { parseFoodsCsv, parseNutrient } from "../foods-csv";

// Valeurs de test arbitraires : elles ne représentent aucun aliment réel.
const CSV = `﻿code;nom;kcal;proteines;glucides;lipides;fibres
1001;"Aliment test A; variante";100,5;10;12,25;3;traces
1002;Aliment test B;50;< 0,5;12;0,2;-
1003;Aliment incomplet;80;-;10;1;2
1004;Aliment incohérent;100;60;60;10;0
1001;Doublon;10;1;1;1;1
`;

describe("import CSV d'aliments", () => {
  it("interprète les mentions de la table", () => {
    expect(parseNutrient("12,5")).toEqual({ value: 12.5, approx: false });
    expect(parseNutrient("traces")).toEqual({ value: 0, approx: true });
    expect(parseNutrient("< 0,5")).toEqual({ value: 0, approx: true });
    expect(parseNutrient("-")).toBeNull();
    expect(parseNutrient("")).toBeNull();
  });

  it("importe, rejette sans inventer et dédoublonne", () => {
    const r = parseFoodsCsv(CSV.replace("code;", "ref;"));
    expect(r.foods.map((f) => f.name)).toEqual(["Aliment test A; variante", "Aliment test B"]);
    expect(r.foods[0]).toMatchObject({ id: "ciqual:1001", kcalPer100: 100.5, carbsPer100: 12.25, fiberPer100: 0, source: "ciqual", ownerId: null });
    expect(r.foods[1]).toMatchObject({ proteinPer100: 0, fiberPer100: null });
    expect(r.approximated).toBe(1);
    expect(r.rejected.map((x) => x.reason)).toEqual(["protein non renseigné", "valeurs incohérentes", "doublon"]);
  });

  it("exige les colonnes obligatoires", () => {
    expect(() => parseFoodsCsv("nom;kcal\nx;1")).toThrow(/proteines/);
  });
});
