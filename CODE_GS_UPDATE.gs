/**
 * IMPORTANT: Add this doGet handler to your existing Code.gs.
 * Replace the existing doGet function with this one.
 * This adds URL parameter routing so the React app can call specific functions.
 */

function doGet(e) {
  // CORS headers for React app
  const output = ContentService.createTextOutput()
  output.setMimeType(ContentService.MimeType.JSON)

  const action = e && e.parameter && e.parameter.action

  try {
    let result
    if (action === 'getAllData') {
      result = getAllData()
    } else if (action === 'getWorkstationData') {
      result = getWorkstationData(e.parameter.ticker)
    } else if (action === 'getCompareData') {
      result = getCompareData(e.parameter.tickerA, e.parameter.tickerB)
    } else if (action === 'getMyTickers') {
      result = getMyTickers()
    } else {
      // Default: serve the old HTML dashboard (fallback)
      return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('MC Portfolio')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    }
    output.setContent(JSON.stringify(result))
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }))
  }

  return output
}
