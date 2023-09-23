// TODO(izaak): Test different hash functions
function hash(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

class DictEntry<T> {
  readonly next: Dict<T>;
  readonly key: string;
  readonly value: T;

  constructor(key: string, value: T, next: Dict<T>) {
    this.next = next;
    this.key = key;
    this.value = value;
  }
}

export class Dict<T> {
  readonly depth: number;
  readonly items: (DictEntry<T> | undefined)[];

  constructor(
    depth: number = 0,
    items: undefined | (DictEntry<T> | undefined)[] = undefined
  ) {
    this.depth = depth;
    if (items === undefined) {
      this.items = Array(32); // Sparse array, which is kinda cool and kinda horrifying
    } else {
      this.items = items;
    }
  }

  static fromObject(x: any): Dict<any> {
    let res = new Dict();
    for (const key of Object.keys(x)) {
      res = res.set(key, x[key]);
    }
    return res;
  }

  toObject(): any {
    let res: any = {};
    for (const item of this.getItems()) {
      res[item[0]] = item[1];
    }
    return res;
  }

  get(k: string): T | undefined {
    let idx = hash(k, this.depth) % 32;
    let entry = this.items[idx];

    if (entry === undefined) {
      return undefined;
    }

    if (entry.key === k) {
      return entry.value;
    }

    return entry.next.get(k);
  }

  set(k: string, v: T): Dict<T> {
    let idx = hash(k, this.depth) % 32;
    let entry = this.items[idx];
    let items_copy = this.items.map((x) => x);

    if (entry === undefined) {
      items_copy[idx] = new DictEntry(k, v, new Dict(this.depth + 1));
    } else if (entry.key === k) {
      items_copy[idx] = new DictEntry(k, v, entry.next);
    } else {
      let new_next = entry.next.set(k, v);
      items_copy[idx] = new DictEntry(entry.key, entry.value, new_next);
    }

    return new Dict(this.depth, items_copy);
  }

  getItems(): [string, T][] {
    let res: [string, T][] = [];
    this.items.forEach((item) => {
      if (item != undefined) {
        res.push([item.key, item.value]);
        res.push(...item.next.getItems());
      }
    });
    return res;
  }

  toString(): string {
    let res = "{";
    for (const item of this.getItems()) {
      res += `${item[0]}: ${item[1]}, `;
    }
    res = res.slice(0, -2) + "}";
    return res;
  }
}
