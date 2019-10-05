// import * as Bluebird from 'bluebird'
// const readFileAsync: any = Bluebird.promisify(require('fs').readFile)
import Step from './step'
import { Position, CompletionItem, CompletionItemKind } from 'vscode-languageserver'

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
  // steps: Step[] = []

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
    const stepRegex = new RegExp(
      '^\\s*?step\\s+("([^"]+?)"|\'([^\']+?)\')\\s+do([\\s\\S]*)$',
    )
    let matches = line.match(stepRegex)

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
   */

  parseSteps(contents: string): Step[] {
    let contentLines = contents.split(/\r?\n/g)
    contentLines = clearLineComments(contentLines)
    return contentLines
      .map((line, index) => {
        let lineNumber = index + 1
        let stepMatch = this.findStep(line)
        if (!stepMatch) {
          return null
        }
        return new Step(stepMatch.pure, lineNumber)
      })
      .filter(Boolean)
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

    // let response = this.elements
    let response = [{ count: 5, text: "a 'v1_tier_1 customer' with email 'mister.robot@adlerson.com' exists" }]
      .filter((element) => {
        let cnt = 0
        // filter out any steps that are not an exact match up to the search words length
        searchWords.forEach((chunk) =>
          element.text.search(chunk) !== -1 && cnt++
        )
        return cnt == searchWords.length
      })
      .map((step) => {
        // format search results.
        // TODO: run through the rest of this method starting herecd
        let label = step.text

        const data = {
          line: position.line,
          start: insertPositionIdx,
          character: position.character,
        }

        return {
          label: label,
          kind: CompletionItemKind.Method,
          data,
          sortText: label,
          filterText: label,
          insertText: step.text,
          documentation: step.text,
        }
      })

    return response
  }

}
