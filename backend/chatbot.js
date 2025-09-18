// index.js
import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const tool = new TavilySearch({
  maxResults: 3,
  topic: "general",
  searchDepth: "basic",
  timeRange: "day",
});

const tools = [tool];
const toolNode = new ToolNode(tools);

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  maxRetries: 2,
}).bindTools(tools);

async function callModel(state) {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}

function sanitizeToolCalls(message) {
  if (message.tool_calls) {
    message.tool_calls = message.tool_calls.map((tc) => {
      if (tc.args.timeRange == null) {
        tc.args.timeRange = "day";
      }
      return tc;
    });
  }
  return message;
}

function shouldCondition(state) {
  let lastMessage = state.messages[state.messages.length - 1];
  lastMessage = sanitizeToolCalls(lastMessage);
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
}

const workFlow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldCondition);

const app = workFlow.compile({ checkpointer });

// ✅ Export generate function
// index.js

export async function generate(message, threadId) {
  const finalState = await app.invoke(
    {
      messages: [{ role: "user", content: message }],
    },
    {
      configurable: { thread_id: threadId },
    }
  );

  // Har message ka content normalize karo
  const cleanedMessages = finalState.messages.map(msg => {
    let content = msg.content;

    // Agar content ek array hai (LangGraph ka format), to text extract karo
    if (Array.isArray(content)) {
      content = content.map(c => (typeof c === "string" ? c : c.text)).join(" ");
    }

    return { role: msg.role, content };
  });

  return cleanedMessages;
}

