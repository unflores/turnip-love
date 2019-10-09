import StepsHandler from '../stepsHandler'
import { expect } from 'chai'
describe('#parseSteps', () => {
	let subject = new StepsHandler()
	it('returns a step for single quote lines', () => {
		let steps = "step 'do things' do"

		expect(subject.parseSteps(steps)[0].step).to.equal("do things")
	})

	it('returns a step for double quote lines', () => {
		let steps = "step \"do things\" do"

		expect(subject.parseSteps(steps)[0].step).to.equal("do things")
	})

	it('does NOT create a step for comments', () => {
		let steps = "# step \"do things\" do"

		expect(subject.parseSteps(steps)[0]).to.equal(undefined)
	})

})
