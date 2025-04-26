# About
Project contains implementations of
 - *Rules engine* pattern
 - *Scatter/gather* pattern

Those patterns are used to deal with coupling and generalize certain workflows.

in NodeJS

# Installation
1. Install NodeJS
2. Clone this repo
3. Run `npm install`
4. Run the code using
	1. `npm run wrong` - run incorrect implementation
	2. `npm run rules` - run Rules engine implementation
	3. `npm run scatter` - run Scatter/Gather implementation

The code should display no result (no error).

# Main example
Main example showcases computation of price based on multiple rules.

## Wrong

`wrong.mts` shows incorrect implementation, where `PriceService` (component computing price) implements all those rules internally this creating tight coupling with other parts of system, such implementation can grow without control, making it unmanageable and not reusable (must be rewritten to change behavior)

# Rules engine

Rules engine represents sequence of rules applied onto data. Instead of Engine component knowing internal structure of every module. Module exports `rule` (e.g. function through interface defining such rule). Those rules are inserted into Rules engine and run in sequence on input data.

![Rules engine](/images/rules-engine.png)

`rulesEngine.mts` showcases price computation using Rules engine pattern. File also showcases use of this patter for authentication/authorization.


# Scatter/Gather

Scatter/Gather patter is usefull to get data from multiple sources. Again ideally without knowing internal workings of module. Module implements interface to provide data, Scatter/Gather component collect the data and processes input based on that data.

![Scatter/Gather](/images/scatter-gather.png)

`scatterGather.mts` showcases price computation using Scatter/Gather pattern. File also showcases use of this patter for creating complex data from multiple sources.
