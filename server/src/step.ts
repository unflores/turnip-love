import * as md5 from 'md5'

export default class Step {
  step: string
  line: number

  constructor(step: string, line: number) {
    this.step = step
    this.line = line
  }

  get id(): string {
    return md5(this.step)
  }
}
