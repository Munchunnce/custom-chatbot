import readline from 'node:readline/promises';

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    while(true){
        const userInput = await rl.question('You');
        if(userInput === 'bye') break;
        console.log('You said', userInput);
    }

    rl.close();
};

main();
