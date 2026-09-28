// MC Score wording: what the evidence supports is "odds", not a buy/sell instruction.
// The model's stored labels (Strong Buy … Strong Sell) stay unchanged so the track record keeps its history.
export const ODDS_LABEL = { 'Strong Buy': 'Very favorable', 'Buy': 'Favorable', 'Hold': 'Neutral', 'Sell': 'Unfavorable', 'Strong Sell': 'Very unfavorable' }
export const oddsLabel = l => ODDS_LABEL[l] || l
