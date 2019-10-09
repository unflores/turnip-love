// import * as Bluebird from 'bluebird'
// const readFileAsync: any = Bluebird.promisify(require('fs').readFile)
import Step from './step'
import { Position, CompletionItem, CompletionItemKind } from 'vscode-languageserver'
import { readFileSync } from 'fs'


/**
 * We don't want comments that define a step to be read so
 * strip out any comments that start at the beginning of a line
 * Leave the array untouched so we can still use the index as line numbers
 * @param contents
 */
function clearLineComments(contents: string[]): string[] {
  return contents.map((line) => (line.search(/^[\s]+#.+$/) ? line : ''))
}

interface StepMatches {
  entireLine: string
  withQuotes: string
  pure: string
  args: string
}

export default class StepsHandler {
  // steps for a file with the filename as the key
  stepsByFile: Map<string, Step[]>
  steps: Step[]

  constructor() {
    this.stepsByFile = new Map()
    this.steps = []
  }
  // TODO:
  // make steps a map of filename to steps[]
  // populate will go through each file and push steps to an array
  // and then merge that map into one elements array which will be used for matching

  // async loadSteps(filePath: string) {
  //   const contents = await readFileAsync(filePath)
  //   this.steps = this.parseSteps(contents)
  // }

  /**
   *  Get matches for a step
   *  step ":user で伝言を開く" do |user|
   * 0 => everything
   * 1 => declaration with quotes
   * 2 => double quote declaration without quotes
   * 3 => single quote declaration without quotes
   * 4 => arguments passed |blah, blah, blah|
   */
  findStep(line: string): StepMatches {

    let matches = line.match(/^\s*step\s+("([^"]+?)"|\'([^\']+?)\')\s+do([\s\S]*)$/)
    if (!matches) {
      return null
    }
    return {
      entireLine: matches[0],
      withQuotes: matches[1],
      pure: matches[2] || matches[3],
      args: matches[4],
    }
  }

  /**
   * Takes in the contents of a steps file, turns them into Steps
   * @param contents Steps file contents
   * @returns Step[]
   * Notes: test the hell out of this function
   */
  parseSteps(contents: string): Step[] {
    let contentLines = contents.split(/\r?\n/g)
    contentLines = clearLineComments(contentLines)
    let lines = contentLines
      .map((line, index) => {
        let lineNumber = index + 1

        let stepMatch = this.findStep(line)
        if (!stepMatch) {
          return null
        }
        return new Step(stepMatch.pure, lineNumber)
      })
      .filter(Boolean)
    return lines
  }

  populate(filename: string): void {
    const steps = this.parseSteps(readFileSync(filename, 'utf8'))
    this.stepsByFile.set(filename, steps)
    this.rebuildSteps()
  }

  rebuildSteps() {
    this.steps = Array.from(this.stepsByFile).reduce(
      (merged, steps) => merged.concat(steps[1]),
      []
    )
  }

  /**
   * list all steps that helps user to complete the sentence.
   * @param line
   * @param position
   */
  getCompletion(line: string, position: Position): CompletionItem[] {
    //Get line part without gherkin part
    const gherkinMatch = new RegExp('^(\\s*)(Given|When|Then|And|But)(\\s+)(.*)')
    let match = line.match(gherkinMatch)

    if (!match) {
      return null
    }

    // step without starter word
    let stepPart = match[4]
    let gerkinWord = match[2]
    let insertPositionIdx = line.indexOf(gerkinWord) + gerkinWord.length + 1

    // Get individual words
    let searchWords = stepPart.split(' ').filter((word) => word !== '').map((word) => word.trim())

    if (searchWords.length == 0) {
      return null
    }

    const filterText = searchWords[searchWords.length - 1]

    let response = this.steps.filter((element) => {
      let cnt = 0
      // filter out any steps that are not an exact match up to the search words length
      searchWords.forEach((chunk) =>
        element.content.search(chunk) !== -1 && cnt++
      )
      return cnt == searchWords.length
    })
      .map((step) => {
        // format search results.
        // TODO: run through the rest of this method starting herecd
        let label = step.content

        const data = {
          line: position.line,
          start: insertPositionIdx,
          character: position.character,
        }

        return {
          label: label,
          kind: CompletionItemKind.Method,
          data,
          documentation: step.content,
        }
      })

    return response
  }

}
