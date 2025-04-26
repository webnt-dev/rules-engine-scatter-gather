import assert from 'node:assert/strict';
/**
 * compute result price based on:
 * - Product hase base price
 * - if user is of type b2b, modify the price by discount
 * - modify it by partner discount
 * - and modify it by special offer, giving 30 % discount on Sundays
 */

type Nullable<T> = T | null;
type Optional<T> = T | undefined;

class Product {
	constructor(public price: number){}
}

class User {
	constructor(public type: string, public priceRatio: number) {}
}

class Partner {
	constructor(public discount: number) {}
}


/**
 * Issues:
 *
 * For what ever reason this service has knowledge of
 *	- existence of all those objects (Product, User, Partner)
 *	- internal knowledge of those types, what the properties are, what is the logic behind them
 *	- hardcoded special offer
 *
 * Not only is this solution not extendible (without modifying internal logic), but given all the knowledge, this
 * coupling inreases blast radius of changes of Product, User, Partner classes
 *
 * And just small one: Naming it PriceService is not good... why is it called Service? that word means nothing...
 * has no value what so ever. Why Price? is there some price entity involved? Just name it priocing
 */
export class PriceService {

	computePrice(product: Product, user: Nullable<User>, partner: Nullable<Partner>, date: Nullable<Date>)	{
		let price = product.price;
		if (user !== null && user.type === 'b2b' && user.priceRatio) {
			price *= user.priceRatio;
		}
		if (partner !== null) {
			price *= partner.discount;
		}
		if (!date) {
			date = new Date();
		}
		if (date.getDay() === 0) {
			price *= 0.7;
		}
		return price;
	}

}


const product = new Product(100);
const user1 = new User('b2b', 0.9);
const user2 = new User('b2c', 0.5);
const partner = new Partner(0.8);


const priceService = new PriceService();
assert.equal(priceService.computePrice(product, user1, partner, new Date(Date.parse('2024-09-08'))), product.price * 0.9 * 0.8 * 0.7);
assert.equal(priceService.computePrice(product, user2, null, new Date(Date.parse('2024-09-06'))), product.price);


