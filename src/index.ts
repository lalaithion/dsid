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

// Dict is a 32-way Hash Array Mapped Trie, which is a fancy way of saying
// it's a hashmap with itself, recursively, as the values. It's an efficient
// immutable data structure for representing a map of strings to values, which
// is useful for react's style of immutable state updates.
//
// Since it's a trie, it's technically O(log(n)) to read and write, but since
// it's a 32 way trie, it's effectively O(1) for all practical purposes. For
// example, a dictionary with a maximum depth of 4 can store 2^20 (~1 million)
// entries, so we're not doing a lot of pointer chasing. However, the average
// dictionary with 2^20 entries will not have a depth of 4, because we run into
// birthday-style collisions, so the average maximum depth will be around 8.
//
// If you're copying this code instead of importing it as a library (which is
// highly encouraged) then you can change the breadth of the trie to a smaller
// value for more performant small objects or a larger value for more performant
// large objects.
export class Dict<T> {
  static BREADTH = 32;

  readonly depth: number;
  readonly items: (DictEntry<T> | undefined)[];

  private constructor(
    depth: number = 0,
    items: undefined | (DictEntry<T> | undefined)[] = undefined
  ) {
    this.depth = depth;
    if (items === undefined) {
      // Lots of documentation for HAMTs says that the trie should use a bitmap
      // along with a dynamic-length array to avoid allocating 32 pointers for
      // empty entries. Luckily, javascript already handles sparse arrays for us,
      // so we don't have to do anything complicated.
      this.items = Array(Dict.BREADTH);
    } else {
      this.items = items;
    }
  }

  static empty<T>(): Dict<T> {
    return new Dict();
  }

  static of<T>(...entries: [string, T][]): Dict<T> {
    let res = new Dict<T>();
    for (const [key, value] of entries) {
      res = res.set(key, value);
    }
    return res;
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
    this.forEach((key, value) => {
      res[key] = value;
    });
    return res;
  }

  get(k: string): T | undefined {
    const idx = hash(k, this.depth) % Dict.BREADTH;
    const entry = this.items[idx];

    if (entry === undefined) {
      return undefined;
    }

    if (entry.key === k) {
      return entry.value;
    }

    return entry.next.get(k);
  }

  set(k: string, v: T): Dict<T> {
    const idx = hash(k, this.depth) % Dict.BREADTH;
    const entry = this.items[idx];
    let items_copy = this.items.map((x) => x);

    if (entry === undefined) {
      items_copy[idx] = new DictEntry(k, v, new Dict(this.depth + 1));
    } else if (entry.key === k) {
      items_copy[idx] = new DictEntry(k, v, entry.next);
    } else {
      const new_next = entry.next.set(k, v);
      items_copy[idx] = new DictEntry(entry.key, entry.value, new_next);
    }

    return new Dict(this.depth, items_copy);
  }

  merge(other: Dict<T>): Dict<T> {
    let new_items = Array(Dict.BREADTH);

    for (let i = 0; i < Dict.BREADTH; i++) {
      const this_item = this.items[i];
      const other_item = other.items[i];
      if (this_item !== undefined && other_item !== undefined) {
        let new_entry_next = this_item.next.merge(other_item.next);
        new_entry_next = new_entry_next.set(other_item.key, other_item.value);
        let new_entry = new DictEntry(
          this_item.key,
          this_item.value,
          new_entry_next
        );
        new_items[i] = new_entry;
      } else if (this_item !== undefined) {
        new_items[i] = this_item;
      } else if (other_item !== undefined) {
        new_items[i] = other_item;
      } else {
        // do nothing
      }
    }

    return new Dict(this.depth, new_items);
  }

  delete(key: string): Dict<T> {
    const idx = hash(key, this.depth) % Dict.BREADTH;
    const item = this.items[idx];

    if (item === undefined) {
      return this;
    }

    if (item.key === key) {
      let items_copy = this.items.map((x) => x);
      items_copy[idx] = undefined;
      const result = new Dict(this.depth, items_copy);
      return result.merge(item.next);
    }

    let items_copy = this.items.map((x) => x);
    items_copy[idx] = new DictEntry(
      item.key,
      item.value,
      item.next.delete(key)
    );
    return new Dict(this.depth, items_copy);
  }

  forEach(f: (k: string, v: T) => void): void {
    this.items.forEach((item) => {
      if (item != undefined) {
        f(item.key, item.value);
        item.next.forEach(f);
      }
    });
  }

  entries(): [string, T][] {
    let res: [string, T][] = [];
    this.forEach((key, value) => {
      res.push([key, value]);
    });
    return res;
  }

  keys(): string[] {
    let res: string[] = [];
    this.forEach((key, _) => {
      res.push(key);
    });
    return res;
  }

  values(): T[] {
    let res: T[] = [];
    this.forEach((_, value) => {
      res.push(value);
    });
    return res;
  }

  toString(): string {
    let res = "{";
    this.forEach((key, value) => {
      res += `${key}: ${value}, `;
    });
    res = res.slice(0, -2) + "}";
    return res;
  }

  // assign is a wrapper around merge for naming consistency with Object.assign
  assign(other: Dict<T>): Dict<T> {
    return this.merge(other);
  }

  static fromEntries<T>(entries: [string, T][]): Dict<T> {
    let res = new Dict<T>();
    for (const item of entries) {
      res = res.set(item[0], item[1]);
    }
    return res;
  }
}
