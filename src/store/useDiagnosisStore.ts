import { create } from 'zustand';

export const COMMUTE_OPTIONS = ['30분 이내', '45분 이내', '1시간 이내'] as const;
export const LIFESTYLE_CHIPS = ['활기형', '조용형', '야근형', '주말활동', '카페·식당', '대중교통', '반려동물'] as const;
export const HOUSEHOLD_TYPES = ['1인 가구', '청년 부부', '예비 신혼', '한부모'] as const;

type CommuteOption = (typeof COMMUTE_OPTIONS)[number];
type HouseholdType = (typeof HOUSEHOLD_TYPES)[number];

export type Hood = {
  rank: number;
  name: string;
  meta: string;
  score: number;
  tier: 1 | 2 | 3;
  lat: number;
  lng: number;
  commuteMinutes: number;
  scores: { work: number; life: number; safe: number };
};

export const CANDIDATE_HOODS: Hood[] = [
  { rank: 0, name: '성수동',  meta: '성동구 · 8호선 · 통근 34분',   commuteMinutes: 34, score: 92, tier: 1, lat: 37.5444, lng: 127.0570, scores: { work: 95, life: 90, safe: 88 } },
  { rank: 0, name: '왕십리동', meta: '성동구 · 2·5호선 · 통근 28분', commuteMinutes: 28, score: 88, tier: 2, lat: 37.5614, lng: 127.0375, scores: { work: 92, life: 82, safe: 90 } },
  { rank: 0, name: '마포동',  meta: '마포구 · 5·6호선 · 통근 22분',  commuteMinutes: 22, score: 87, tier: 2, lat: 37.5565, lng: 126.9368, scores: { work: 88, life: 85, safe: 80 } },
  { rank: 0, name: '금호동',  meta: '성동구 · 3호선 · 통근 38분',   commuteMinutes: 38, score: 85, tier: 2, lat: 37.5471, lng: 127.0179, scores: { work: 85, life: 80, safe: 92 } },
  { rank: 0, name: '합정동',  meta: '마포구 · 2·6호선 · 통근 26분',  commuteMinutes: 26, score: 84, tier: 2, lat: 37.5496, lng: 126.9143, scores: { work: 82, life: 88, safe: 78 } },
  { rank: 0, name: '행당동',  meta: '성동구 · 5호선 · 통근 32분',   commuteMinutes: 32, score: 82, tier: 3, lat: 37.5630, lng: 127.0536, scores: { work: 80, life: 85, safe: 82 } },
  { rank: 0, name: '동작동',  meta: '동작구 · 4·9호선 · 통근 45분',  commuteMinutes: 45, score: 80, tier: 3, lat: 37.5126, lng: 126.9393, scores: { work: 78, life: 82, safe: 80 } },
  { rank: 0, name: '옥수동',  meta: '성동구 · 3호선 · 통근 42분',   commuteMinutes: 42, score: 78, tier: 3, lat: 37.5424, lng: 127.0116, scores: { work: 75, life: 80, safe: 80 } },
  { rank: 0, name: '은평동',  meta: '은평구 · 3·6호선 · 통근 55분',  commuteMinutes: 55, score: 72, tier: 3, lat: 37.6027, lng: 126.9291, scores: { work: 70, life: 75, safe: 78 } },
];

const COMMUTE_LIMIT_MINUTES: Record<CommuteOption, number> = {
  '30분 이내': 30,
  '45분 이내': 45,
  '1시간 이내': 60,
};

export function computeDiagnosisResults(commuteLimit: CommuteOption): Hood[] {
  const limitMin = COMMUTE_LIMIT_MINUTES[commuteLimit];

  const scored = CANDIDATE_HOODS.map((h) => {
    const over = Math.max(0, h.commuteMinutes - limitMin);
    const penalty = over > 15 ? Math.round(h.score * 0.25) : over > 0 ? Math.round(h.score * 0.12) : 0;
    return { ...h, score: h.score - penalty };
  });

  return scored
    .filter((h) => h.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((h, i) => ({
      ...h,
      rank: i + 1,
      tier: (i === 0 ? 1 : i < 3 ? 2 : 3) as Hood['tier'],
    }));
}

interface DiagnosisState {
  // step1
  companyName: string;
  workAddress: string;
  jobCategoryId: string;
  jobCategoryName: string;
  // step2
  commuteLimit: CommuteOption;
  lifestyle: string[];
  // step3
  depositWan: number;
  monthlyRentWan: number;
  // step4
  age: string;
  annualIncomeWan: string;
  householdType: HouseholdType;
  homeOwnerless: boolean;
  // 진단 결과
  results: Hood[];

  setCompanyName: (v: string) => void;
  setWorkAddress: (v: string) => void;
  setJobCategory: (id: string, name: string) => void;
  setCommuteLimit: (v: CommuteOption) => void;
  toggleLifestyle: (chip: string) => void;
  setDepositWan: (v: number) => void;
  setMonthlyRentWan: (v: number) => void;
  setAge: (v: string) => void;
  setAnnualIncomeWan: (v: string) => void;
  setHouseholdType: (v: HouseholdType) => void;
  setHomeOwnerless: (v: boolean) => void;
  setResults: (hoods: Hood[]) => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  companyName: '',
  workAddress: '',
  jobCategoryId: '',
  jobCategoryName: '',
  commuteLimit: '45분 이내',
  lifestyle: [],
  depositWan: 3000,
  monthlyRentWan: 60,
  age: '',
  annualIncomeWan: '',
  householdType: '1인 가구',
  homeOwnerless: true,
  results: [],

  setCompanyName: (v) => set({ companyName: v }),
  setWorkAddress: (v) => set({ workAddress: v }),
  setJobCategory: (id, name) => set({ jobCategoryId: id, jobCategoryName: name }),
  setCommuteLimit: (v) => set({ commuteLimit: v }),
  toggleLifestyle: (chip) =>
    set((s) => ({
      lifestyle: s.lifestyle.includes(chip)
        ? s.lifestyle.filter((c) => c !== chip)
        : [...s.lifestyle, chip],
    })),
  setDepositWan: (v) => set({ depositWan: v }),
  setMonthlyRentWan: (v) => set({ monthlyRentWan: v }),
  setAge: (v) => set({ age: v }),
  setAnnualIncomeWan: (v) => set({ annualIncomeWan: v }),
  setHouseholdType: (v) => set({ householdType: v }),
  setHomeOwnerless: (v) => set({ homeOwnerless: v }),
  setResults: (hoods) => set({ results: hoods }),
}));
