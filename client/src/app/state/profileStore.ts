import { create } from 'zustand';
import { type Cosmetic, type CosmeticKind, COSMETICS, type Gains, type MatchSummary, type Profile, applyMatch, dayKey, newProfile, unlockedIds } from '../../game/progression';

const KEY = 'netanchal-profile-v1';
const randomName = () => `Neta ${Math.floor(100 + Math.random() * 900)}`;

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Profile>;
      // anything missing in an older save falls back to the defaults
      return { ...newProfile(typeof parsed.name === 'string' && parsed.name ? parsed.name : randomName()), ...parsed };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return newProfile(randomName());
}

function save(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: progress lasts for this visit only */
  }
}

interface ProfileState {
  profile: Profile;
  /** what the last finished match paid out, shown on the results screen */
  lastGains: Gains | null;
  recordMatch: (m: MatchSummary) => Gains;
  clearGains: () => void;
  setName: (name: string) => void;
  equip: (kind: CosmeticKind, id: string) => void;
  finishTutorial: () => void;
  replayTutorial: () => void;
  addShare: () => void;
}

export const profileStore = create<ProfileState>((set, get) => ({
  profile: load(),
  lastGains: null,
  recordMatch: (m) => {
    const { profile, gains } = applyMatch(get().profile, m, dayKey());
    save(profile);
    set({ profile, lastGains: gains });
    return gains;
  },
  clearGains: () => set({ lastGains: null }),
  setName: (name) => {
    const profile = { ...get().profile, name: name.trim().slice(0, 16) || get().profile.name };
    save(profile);
    set({ profile });
  },
  equip: (kind, id) => {
    const c = COSMETICS.find((x) => x.id === id && x.kind === kind);
    const p = get().profile;
    if (!c || !unlockedIds(p).has(id)) return;
    const profile = { ...p, equipped: { ...p.equipped, [kind]: id } };
    save(profile);
    set({ profile });
  },
  finishTutorial: () => {
    const profile = { ...get().profile, tutorialDone: true };
    save(profile);
    set({ profile });
  },
  replayTutorial: () => {
    const profile = { ...get().profile, tutorialDone: false };
    save(profile);
    set({ profile });
  },
  addShare: () => {
    const profile = { ...get().profile, shares: get().profile.shares + 1 };
    save(profile);
    set({ profile });
  },
}));

/** the equipped item for a slot, if it is unlocked and not the "none" entry */
export function equippedCosmetic(kind: CosmeticKind): Cosmetic | null {
  const p = profileStore.getState().profile;
  const id = p.equipped[kind];
  if (!id) return null;
  const c = COSMETICS.find((x) => x.id === id);
  return c && c.color && unlockedIds(p).has(c.id) ? c : null;
}
