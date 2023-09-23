import { Dict } from './index';

function perf_object() {
    const characters = 'abcdefghijklmnopqrst';

    for (let a = 2; a < characters.length; a += 2) {
        
    let start = Date.now();
    let keyCounter = new Set();

    let x: any = {};

    for (let i = 0; i < 500; i++) {
        for (let j = 0; j < 500; j++) {
            let key = characters.slice(i % a, (j/a) % a);
            keyCounter.add(key)
            x[key] = i+j
        }
    }

    let duration = Date.now() - start;
    console.log(`keys=${keyCounter.size} \t object \t ${duration}`);
    }
}

function perf_react() {
    const characters = 'abcdefghijklmnopqrst';

    for (let a = 2; a < characters.length; a += 2) {
            
    let start = Date.now();
    let keyCounter = new Set();

    let x: any = {};

    for (let i = 0; i < 500; i++) {
        for (let j = 0; j < 500; j++) {
            let key = characters.slice(i % a, (j/a) % a);
            keyCounter.add(key)
            let tmp = {...x}
            tmp[key] = i+j
            x = tmp
        }
    }

    let duration = Date.now() - start;
    console.log(`keys=${keyCounter.size} \t react \t ${duration}`);
}
}

function perf_dict() {
    const characters = 'abcdefghijklmnopqrst';


    for (let a = 2; a < characters.length; a += 2) {
    let start = Date.now();
    let keyCounter = new Set();

    let x: Dict<number> = new Dict();

    for (let i = 0; i < 500; i++) {
        for (let j = 0; j < 500; j++) {
            let key = characters.slice(i % a, (j/a) % a);
            keyCounter.add(key)
            x = x.set(key, i+j)
        }
    }

    let duration = Date.now() - start;
    console.log(`keys=${keyCounter.size} \t dict \t ${duration}`);
}
}

perf_object();
perf_react();
perf_dict();
