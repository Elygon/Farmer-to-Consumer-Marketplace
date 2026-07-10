export const PRODUCE_CATEGORIES = [
    'vegetables',
    'fruits',
    'grains',
    'tubers',
    'livestock',
    'poultry',
    'dairy',
    'spices'
] as const

export type ProduceCategory = typeof PRODUCE_CATEGORIES[number]