const round = (value) => Math.round((value + Number.EPSILON) * 10) / 10;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export function distribution(scores = []) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const score of scores) if (result[score] !== undefined) result[score] += 1;
  return result;
}

function reasonCounts(ratings, field) {
  const counts = new Map();
  for (const rating of ratings) {
    for (const reason of rating[field] || []) counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export function aggregateRatings(ratings = []) {
  const count = ratings.length;
  const average = (field) => count ? round(ratings.reduce((sum, rating) => sum + rating[field], 0) / count) : null;
  return {
    count,
    coreAverage: average('coreScore'),
    experienceAverage: average('experienceScore'),
    coreDistribution: distribution(ratings.map((rating) => rating.coreScore)),
    experienceDistribution: distribution(ratings.map((rating) => rating.experienceScore)),
    coreReasons: reasonCounts(ratings, 'coreReasons'),
    experienceReasons: reasonCounts(ratings, 'experienceReasons'),
  };
}

export function combineScores({ aiCoreScore, aiExperienceScore, aggregate }) {
  const aiCorePercent = round(clamp(aiCoreScore, 0, 50) * 2);
  const aiExperiencePercent = round(clamp(aiExperienceScore, 0, 50) * 2);
  const playerCorePercent = aggregate.coreAverage == null ? null : round(aggregate.coreAverage * 20);
  const playerExperiencePercent = aggregate.experienceAverage == null ? null : round(aggregate.experienceAverage * 20);
  const provisional = aggregate.count === 0;
  const core = playerCorePercent == null ? null : round(aiCorePercent * 0.6 + playerCorePercent * 0.4);
  const experience = playerExperiencePercent == null ? null : round(aiExperiencePercent * 0.6 + playerExperiencePercent * 0.4);
  return {
    provisional,
    aiCorePercent,
    aiExperiencePercent,
    playerCorePercent,
    playerExperiencePercent,
    core: provisional ? null : core,
    experience: provisional ? null : experience,
    final: provisional || core == null || experience == null ? null : round((core + experience) / 2),
  };
}
