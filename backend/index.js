import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import readline from 'node:readline/promises';

/**
 * 1. Define node function
 * 2. build the graph
 * 3. compile and invoke the graph
 */

/**
 * initialies the LLM
 */

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
  // other params...
});

/**
 * 1. Define node function
 */
async function callModel(state) {
    // call the LLM using APIs
    console.log('caling LLM...');
    const response = await llm.invoke(state.messages);
    return { messages: [response] };
}

/**
 * biuld the graph
 */
const workFlow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addEdge("__start__", "agent")
    .addEdge("agent", "__end__");

/**
 * Compile the graph
 */    
const app = workFlow.compile();
async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    while(true){
        const userInput = await rl.question('You:');
        if(userInput === 'bye') break;
        const finalState = await app.invoke({ role: 'user', messages: userInput });

        const lastMessage = await finalState.messages[finalState.messages.length - 1];
        console.log('AI: ', lastMessage.content);
    }

    rl.close();
};

main();
