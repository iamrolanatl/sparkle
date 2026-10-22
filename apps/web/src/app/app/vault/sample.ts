/** Example documents for the Vault preview (DEC-144: sample data only; no real student records). */
export type VaultClass = "standard" | "academic" | "sensitive";
export type SampleDoc = { id: string; title: string; cls: VaultClass; from: string; text: string };
export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: "q1",
    title: "Q1 progress report",
    cls: "academic",
    from: "Dickerson MS · Oct 16",
    text: "quarter 1 progress report math ela science social studies",
  },
  { id: "504", title: "504 plan — 2026–27", cls: "sensitive", from: "Counseling · Aug 14", text: "" },
  { id: "imm", title: "Immunization certificate (Form 3231)", cls: "sensitive", from: "Health · Jul 30", text: "" },
  {
    id: "pic",
    title: "Picture day order form",
    cls: "standard",
    from: "Front office · Sep 3",
    text: "picture day order form packages due sept 10",
  },
  {
    id: "map",
    title: "MAP Growth score report",
    cls: "academic",
    from: "Cobb Schools · Sep 26",
    text: "map growth reading math rit score percentile",
  },
  {
    id: "bus",
    title: "Bus route letter",
    cls: "standard",
    from: "Transportation · Aug 1",
    text: "bus route stop time pickup 7:42 am",
  },
];
