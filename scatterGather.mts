import assert from 'node:assert/strict';
/**
 * compute result price based on:
 * - Product hase base price
 * - if user is of type b2b, modify the price by discount
 * - modify it by partner discount
 * - and modify it by special offer, giving 30 % discount on Sundays
 *
 * move the internal logic where it belongs -> into its own context / domain
 */

type Nullable<T> = T | null;
type Optional<T> = T | undefined;

interface GetDiscount {
	getDiscount: () => number;
}

class Product {
	constructor(public price: number){}
}

class User implements GetDiscount {
	constructor(public type: string, public priceRatio: number) {}

	getDiscount(): number {
		if (this.type === 'b2b') {
			return this.priceRatio;
		}
		return 1;
	}
}

class Partner implements GetDiscount {
	constructor(public discount: number) {}
	getDiscount(): number {
		return this.discount;
	}
}

class SpecialOffer implements GetDiscount {
	constructor(public date: Nullable<Date>) {}
	getDiscount(): number {
		if (!this.date) {
			this.date = new Date();
		}
		if (this.date.getDay() === 0) {
			return 0.7;
		}
		return 1;
	}
}


/**
 * Scatter-Gather:
 * 		spread collecting data and process the results
 *
 * Order, in which sources are queried should not matter!
 */

abstract class ScatterGather<TSource, TInput, TResult> {

	protected sources: TSource[] = []

	addSources(sources: TSource[]) {
		this.sources.push(...sources);
		return this;
	}

	resetSources() {
		this.sources = [];
		return this;
	}

	setSources(sources: TSource[]) {
		this.resetSources().addSources(sources);
		return this;
	}

	abstract run(input: TInput): TResult;


}

/**
 * Zero coupling to all classes, only knowledge of GetDiscount interface
 */

class Pricing extends ScatterGather<GetDiscount, number, number> {

	/**
	 * run all rules for data
	 */
	run(price: number)	{
		this.sources.forEach((source) => {
			price *= source.getDiscount();
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
pricing.addSources([user1, partner, offer1]);
assert.equal(pricing.run(product.price), product.price * 0.9 * 0.8 * 0.7);

pricing.setSources([user2]);
assert.equal(pricing.run(product.price), product.price);


/**
 * Scatter-gather can be user for a lot of similar patterns, e.g. collecting result data
 *
 * and let's make it async for fun, assuming some DB or remote calls
 */

export type JSONScalar = string | number | boolean | null;
export type JSONObject = {
	[property: string]: JSONData;
};
export type JSONData = JSONScalar | JSONArray | JSONObject;
export type JSONArray = JSONData[];

interface DTOData {
	getDTOData: () => Promise<[string, JSONObject]>;
}

class DTOCreator {

	protected sources: DTOData[] = [];

	addSources(sources: DTOData[]) {
		this.sources.push(...sources);
		return this;
	}

	resetSources() {
		this.sources = [];
		return this;
	}

	setSources(sources: DTOData[]) {
		this.resetSources().addSources(sources);
		return this;
	}

	async run(): Promise<JSONObject>	{
		const data = await Promise.all(this.sources.map((source) => source.getDTOData()));
		const result: JSONObject = {};
		data.forEach(([key, value]) => {
			result[key] = value;
		})
		return result;
	}

}

class Person implements DTOData {
	constructor(public name: string) {}

	async getDTOData(): Promise<[string, JSONObject]> {
		return ['user', { name: this.name }];
	}
}

class Company implements DTOData{
	constructor(public companyName: string, public address: string) {}

	async getDTOData(): Promise<[string, JSONObject]> {
		return Promise.resolve(['company', { companyName: this.companyName, address: this.address }]);
	}

}

class PersonAddress implements DTOData{
	constructor(public street: string, public city: string, public country: string) {}

	async getDTOData(): Promise<[string, JSONObject]> {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(['address', { street: this.street, city: this.city, country: this.country }]);
			}, 500);
		})

	}
}

const person = new Person('Bronislav');
const company = new Company('WebNT', 'My Street, Czech Republic');
const personAddress = new PersonAddress('Some Street', 'BestCity', 'Czech Republic');

const dtoCreator = new DTOCreator();
dtoCreator.addSources([person, company, personAddress]);
const personDTO = await dtoCreator.run()
assert.deepEqual(personDTO, {
	user: {
		name: 'Bronislav'
	},
	company: {
		companyName: 'WebNT',
		address: 'My Street, Czech Republic'
	},
	address: {
		street: 'Some Street',
		city: 'BestCity',
		country: 'Czech Republic'
	}
});


dtoCreator.setSources([company]);
const companyDTO = await dtoCreator.run()
assert.deepEqual(companyDTO, {
	company: {
		companyName: 'WebNT',
		address: 'My Street, Czech Republic'
	},
});
