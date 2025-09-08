import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import readline from 'node:readline/promises';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from "@langchain/tavily";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const tool = new TavilySearch({
  maxResults: 3,
  topic: "general",
  searchDepth: "basic",
  timeRange: "day",
  // includeAnswer: false,
  // includeRawContent: false,
  // includeImages: false,
  // includeImageDescriptions: false,
  // includeDomains: [],
  // excludeDomains: [],
});
/**
 * initialies the tool node
 */
const tools = [tool];
const toolNode = new ToolNode(tools);

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
  maxRetries: 2,
  // other params...
}).bindTools(tools);

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
// Sanitize function (in case tool calls contain null)
function sanitizeToolCalls(message) {
  if (message.tool_calls) {
    message.tool_calls = message.tool_calls.map(tc => {
      if (tc.args.timeRange == null) {
        tc.args.timeRange = "day"; // fallback
      }
      return tc;
    });
  }
  return message;
}

//  Conditional edge
function shouldCondition(state) {
    let lastMessage = state.messages[state.messages.length - 1];
    lastMessage = sanitizeToolCalls(lastMessage);
    if(lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return 'tools';
    }
    return '__end__';
}
const workFlow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldCondition);

/**
 * Compile the graph
 */    
const app = workFlow.compile({ checkpointer });

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    while(true){
        const userInput = await rl.question('You:');
        if(userInput === 'bye') break;

        const finalState = await app.invoke({
            messages: [{ role: 'user', content: userInput }]
        },
        {
            configurable: { thread_id: 'id'}
        }
    );

        const lastMessage = await finalState.messages[finalState.messages.length - 1];
        // Agar tool-call hai, to uska result agent se aayega
        if (lastMessage.content) {
        console.log("AI:", lastMessage.content);
        } else if (lastMessage.tool_calls) {
        console.log("🔧 Tool invoked:", lastMessage.tool_calls);
        }
    }

    rl.close();
};

main();
