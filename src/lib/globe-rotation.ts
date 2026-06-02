const MAX_FOCUS_THETA = 0.7

export function getFocusRotation([latitude, longitude]: [number, number]) {
  return {
    phi: ((-90 - longitude) * Math.PI) / 180,
    theta: Math.max(
      -MAX_FOCUS_THETA,
      Math.min(MAX_FOCUS_THETA, (latitude * Math.PI) / 180)
    ),
  }
}
