export function getFocusRecommendation(cognitiveLoad: number) {
  if (cognitiveLoad > 75) {
    return {
      status: 'Critical Load Warning',
      suggestion: 'Heavy meeting load detected. Defer non-critical note edits and schedule deep breaks.',
    };
  }
  return {
    status: 'Optimal Focus State',
    suggestion: 'Excellent window for technical sprints. Allocate 90-minute blocks.',
  };
}
