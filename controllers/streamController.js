import OpenAI from "openai";
import dotenv from "dotenv";
import { UsersGenData } from "../models/usersGeneratedData.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// streaming function starts here

export const streamChat = async (socket, param) => {
  let data = param;
  console.log(data);
  var filter = "";

  if (data.filters["summarize"]) {
    filter = data.filters["marks"] === 0 ? "summarize" : `summarize in ${data.filters["marks"]} marks`;
  } else if (data.filters["explainToKid"]) {
    filter = data.filters["marks"] === 0 ? "explain to 5 years old" : `explain to 5 years old ${data.filters["marks"]} marks`;
  } else {
    filter = data.filters["marks"] > 0 ? `in ${data.filters["marks"]} marks` : "";
  }

  var userMessage = `${data.query} ? ${filter}`;
  console.log(`Question: ${userMessage}`);
  // Print the line to the console

  try {
    var completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "AI Tutor Instructions: Give clear, precise answers .\n- assist students writing improvement\n- Structure long answers\n- Avoid repetition.\n- be concise.",
        },
        {
          role: "user",
          content: userMessage
        },
      ],
      model: "gpt-3.5-turbo-0125",
      stream: true,
      // Set max-token based on user free/premium
    });

    let arr_answer = [];
    for await (const chunk of completion) {
      let message = chunk.choices[0].delta.content;
      if (message === undefined) {
        socket.disconnect(
          console.log("socket disconnected")
        );
      }
      arr_answer.push(message);
      socket.emit("answer-stream", `${message}`);
    }

    const answer = arr_answer.join("");
    console.log(answer);
    

    const newUserData = {
      userId: data.userId,
      question: userMessage,
      answers: answer,
    };
    await UsersGenData.create(newUserData);
    completion = null; // resetting socket data

  } catch (error) {
    console.log(error);
  }
};
