import * as md5 from 'md5'

export default class Step {
  content: string
  line: number

  constructor(content: string, line: number) {
    this.content = content
    this.line = line
  }

  get id(): string {
    return md5(this.content)
  }
}
