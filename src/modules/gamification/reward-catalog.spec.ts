import { levelFromXp, REWARD_CATALOG } from './reward-catalog.js';
import { RewardTaskType } from '@prisma/client';

describe('reward catalog', () => {
  it('awards micro-XP for every supported task type', () => {
    expect(REWARD_CATALOG[RewardTaskType.SENTENCE_COMPLETED].xp).toBe(5);
    expect(REWARD_CATALOG[RewardTaskType.PAGE_COMPLETED].xp).toBe(20);
    expect(REWARD_CATALOG[RewardTaskType.FOCUS_MILESTONE].xp).toBe(10);
    expect(REWARD_CATALOG[RewardTaskType.SESSION_COMPLETED].xp).toBe(15);
  });

  it('keeps level progress monotonic and bounded', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(25).level).toBe(2);
    expect(levelFromXp(100).level).toBe(3);
    expect(levelFromXp(1000).levelProgressPercent).toBeGreaterThanOrEqual(0);
    expect(levelFromXp(1000).levelProgressPercent).toBeLessThanOrEqual(100);
    expect(levelFromXp(-20).totalXp).toBe(0);
  });
});
