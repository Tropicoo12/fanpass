import type { Json, MatchMarket } from '@/types/database'

export type MarketOption = {
  key: string
  label: string
  odds: number
}

export function parseMarketOptions(value: Json): MarketOption[] {
  if (!Array.isArray(value)) return []

  return value.filter((option): option is MarketOption => {
    if (!option || typeof option !== 'object' || Array.isArray(option)) return false
    const item = option as Record<string, Json | undefined>
    return (
      typeof item.key === 'string' &&
      typeof item.label === 'string' &&
      typeof item.odds === 'number'
    )
  })
}

export function marketIsExpired(market: MatchMarket) {
  return Boolean(market.closes_at && new Date(market.closes_at).getTime() <= Date.now())
}
