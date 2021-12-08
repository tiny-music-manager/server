declare const devmode: boolean

interface ObjectConstructor {
	keys<T>(o: T): Array<keyof T>;
}