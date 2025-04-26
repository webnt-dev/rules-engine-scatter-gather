import assert from 'node:assert/strict';
/**
 * compute result price based on:
 * - Product hase base price
 * - if user is of type b2b, modify the price by discount
 * - modify it by partner discount
 * - and modify it by special offer, giving 30 % discount on Sundays
 *
 * move the computation logic where it belongs -> into its own context / domain
 */

type Nullable<T> = T | null;
type Optional<T> = T | undefined;

interface ComputePrice {
	computePrice: (price: number) => number;
}

class Product {
	constructor(public price: number){}
}

class User implements ComputePrice {
	constructor(public type: string, public priceRatio: number) {}

	computePrice(price: number): number {
		if (this.type === 'b2b') {
			return price * this.priceRatio;
		}
		return price;
	}
}

class Partner implements ComputePrice {
	constructor(public discount: number) {}
	computePrice(price: number): number {
		return price * this.discount;
	}
}

class SpecialOffer implements ComputePrice {
	constructor(public date: Nullable<Date>) {}
	computePrice(price: number): number {
		if (!this.date) {
			this.date = new Date();
		}
		if (this.date.getDay() === 0) {
			price *= 0.7;
		}
		return price;
	}
}


/**
 * Rules engine:
 * 		set up rules and run data throu those rules
 *
 * Order, in which rules are processed should not matter!
 */

abstract class RuleEngine<TRule, TInput, TResult> {

	protected rules: TRule[] = []

	addRules(rules: TRule[]) {
		this.rules.push(...rules);
		return this;
	}

	resetRules() {
		this.rules = [];
		return this;
	}

	setRules(rules: TRule[]) {
		this.resetRules().addRules(rules);
		return this;
	}

	abstract run(input: TInput): TResult;


}

/**
 * Zero coupling to all classes, only knowledge of ComputePrice interface
 */

class Pricing extends RuleEngine<ComputePrice, number, number> {

	/**
	 * run all rules for data
	 */
	run(price: number)	{
		price = this.rules.reduce<number>((prev: number, current: ComputePrice) => {
			return current.computePrice(prev);
		}, price)

		return price;
	}

}


const product = new Product(100);
const user1 = new User('b2b', 0.9);
const user2 = new User('b2c', 0.5);
const partner = new Partner(0.8);
const offer1 = new SpecialOffer(new Date(Date.parse('2024-09-08')));
const offer2 = new SpecialOffer(new Date(Date.parse('2024-09-06')));


const pricing = new Pricing();
pricing.addRules([user1, partner, offer1]);
assert.equal(pricing.run(product.price), product.price * 0.9 * 0.8 * 0.7);

pricing.setRules([user2]);
assert.equal(pricing.run(product.price), product.price);


/**
 * Rules engine can be user for a lot of similar patterns, e.g. authentication/authorization
 * with early exit
 */

interface IsRequestAllowedInput {
	token: string;
	path: string;
	source: {
		ip: string;
	}
}

abstract class IsRequestAllowed {
	abstract isRequestAllowed (input: IsRequestAllowedInput): boolean;
}

class CheckToken extends IsRequestAllowed {

	override isRequestAllowed (input: IsRequestAllowedInput): boolean {
		return input.token === 'allowed';
	}
}

class CheckPath extends IsRequestAllowed {
	override isRequestAllowed (input: IsRequestAllowedInput): boolean {
		return ['/path', '/dest'].includes(input.path);
	}
}

class IPBlocker extends IsRequestAllowed {
		override isRequestAllowed (input: IsRequestAllowedInput): boolean {
		return !(['1.2.3.4', '5.6.7.8'].includes(input.source.ip));
	}
}

class RequestChecker extends RuleEngine<IsRequestAllowed, IsRequestAllowedInput, boolean> {
	run(input: IsRequestAllowedInput) {
		// early exit, if any rules returs false, [].every returns false immediately
		return this.rules.every((rule) => rule.isRequestAllowed(input));
	}
}

const checker = new RequestChecker();
checker.addRules([new CheckToken(), new IPBlocker(), new CheckPath()]);
assert.equal(checker.run({token: 'allowed', path: '/path', source: { ip: '7.8.9.0'} }), true);

checker.setRules([new CheckToken(), new CheckPath()]);
assert.equal(checker.run({token: 'allowed', path: '/path', source: { ip: '1.2.3.4'} }), true);

checker.setRules([new CheckToken(), new IPBlocker(), new CheckPath()]);
assert.equal(checker.run({token: 'allowed', path: '/path', source: { ip: '1.2.3.4'} }), false);
