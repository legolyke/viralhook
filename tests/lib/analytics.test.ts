import { describe, it, expect, vi } from 'vitest'
import {
  getUserStats,
  getExportsByDay,
  getTopClips,
  getPlatformUserStats,
  getPlatformActivityStats,
  buildBarChartSvg,
} from '@/lib/analytics'

function makeChain(finalValue: unknown = { data: null, error: null, count: 0 }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'in', 'single']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // terminal resolvers
  ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['limit'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['in'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['gte'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  return chain
}

function makeSupabase(finalValue: unknown = { data: null, error: null, count: 0 }) {
  const chain = makeChain(finalValue)
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}

describe('getUserStats', () => {
  it('returns zeros when no data', async () => {
    const sb = makeSupabase({ data: null, error: null, count: 0 })
    const result = await getUserStats(sb as never, 'user-1')
    expect(result.projectCount).toBe(0)
    expect(result.clipCount).toBe(0)
    expect(result.exportsUsed).toBe(0)
    expect(result.avgViralityScore).toBeNull()
  })
})

describe('getExportsByDay', () => {
  it('returns empty array when no exports', async () => {
    const sb = makeSupabase({ data: [], error: null })
    const result = await getExportsByDay(sb as never, 'user-1', 30)
    expect(result).toEqual([])
  })
})

describe('getTopClips', () => {
  it('returns empty array when no clips', async () => {
    const sb = makeSupabase({ data: [], error: null })
    const result = await getTopClips(sb as never, 'user-1', 3)
    expect(result).toEqual([])
  })
})

describe('getPlatformUserStats', () => {
  it('returns zeros when no data', async () => {
    const sb = makeSupabase({ data: [], error: null, count: 0 })
    const result = await getPlatformUserStats(sb as never)
    expect(result.totalUsers).toBe(0)
    expect(result.byPlan.free).toBe(0)
    expect(result.mrr).toBe(0)
    expect(result.arr).toBe(0)
  })
})

describe('getPlatformActivityStats', () => {
  it('returns zeros when no data', async () => {
    const sb = makeSupabase({ data: [], error: null, count: 0 })
    const result = await getPlatformActivityStats(sb as never)
    expect(result.totalProjects).toBe(0)
    expect(result.totalClips).toBe(0)
    expect(result.totalExports).toBe(0)
  })
})

describe('buildBarChartSvg', () => {
  it('returns a valid SVG string for normal data', () => {
    const data = [
      { date: '2026-05-01', count: 3 },
      { date: '2026-05-02', count: 5 },
      { date: '2026-05-03', count: 0 },
    ]
    const svg = buildBarChartSvg(data)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
  })

  it('handles all-zero data without dividing by zero', () => {
    const data = [{ date: '2026-05-01', count: 0 }]
    const svg = buildBarChartSvg(data)
    expect(svg).toContain('<svg')
  })

  it('returns empty string when data is empty', () => {
    const svg = buildBarChartSvg([])
    expect(svg).toBe('')
  })
})
