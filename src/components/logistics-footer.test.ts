import { describe, expect, it } from "vitest"
import { getFocusRotation } from "../lib/globe-rotation"

function toCobeCartesian([latitude, longitude]: [number, number]) {
  const lat = (latitude * Math.PI) / 180
  const lon = (longitude * Math.PI) / 180 - Math.PI
  const cosLat = Math.cos(lat)

  return [-cosLat * Math.cos(lon), Math.sin(lat), cosLat * Math.sin(lon)]
}

function projectWithCobeRotation(
  location: [number, number],
  rotation: { phi: number; theta: number }
) {
  const [x, y, z] = toCobeCartesian(location)
  const cosTheta = Math.cos(rotation.theta)
  const sinTheta = Math.sin(rotation.theta)
  const cosPhi = Math.cos(rotation.phi)
  const sinPhi = Math.sin(rotation.phi)

  const projectedX = cosPhi * x + sinPhi * z
  const projectedY =
    sinPhi * sinTheta * x + cosTheta * y - cosPhi * sinTheta * z
  const visibleDepth =
    -sinPhi * cosTheta * x + sinTheta * y + cosPhi * cosTheta * z

  return { projectedX, projectedY, visibleDepth }
}

describe("getFocusRotation", () => {
  it.each([
    ["Null Island", [0, 0]],
    ["Bogotá", [4.711, -74.0721]],
    ["Addis Abeba", [8.9806, 38.7578]],
    ["São Paulo", [-23.5558, -46.6396]],
    ["Hanoi", [21.0278, 105.8342]],
  ] as Array<[string, [number, number]]>)(
    "rotates %s to the visible center of the cobe globe",
    (_name, location) => {
      const projected = projectWithCobeRotation(
        location,
        getFocusRotation(location)
      )

      expect(projected.projectedX).toBeCloseTo(0, 12)
      expect(projected.projectedY).toBeCloseTo(0, 12)
      expect(projected.visibleDepth).toBeGreaterThan(0)
    }
  )
})
