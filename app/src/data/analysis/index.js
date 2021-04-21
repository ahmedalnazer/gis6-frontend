import fault from './fault'
import wiring from './wiring'

const analyses = { fault, wiring }

export const setupAnalysis = report => {
  // console.log(a)
  if(analyses[report.reportType]) analyses[report.reportType].setup(report)
}