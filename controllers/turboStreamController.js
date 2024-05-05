import OpenAI from "openai";
import dotenv from "dotenv";
import { UsersGenData } from "../models/usersGeneratedData.js";
import hitCounter from "../utils/counter.js";
import { Tiktoken } from "tiktoken/lite";
import { load } from "tiktoken/load";
import models from "tiktoken/model_to_encoding.json" assert { type: "json" };
import registry from "../node_modules/tiktoken/registry.json" assert { type: "json" };
import { SubscriberModel } from "../models/subscribersModel.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// streaming function starts here

export const turboStreamChat = async (socket, param) => {
  let data = param;
  const base64Image = data.base64Image;
  const model = await load(registry[models["gpt-4-turbo"]]);
  const encoder = new Tiktoken(model.bpe_ranks, model.special_tokens, model.pat_str);

  let completionTokens = 0;

  var filter = "";

  if (data.filters["summarize"]) {
    filter = data.filters["marks"] === 0 ? "summarize" : `summarize in ${data.filters["marks"]} marks`;
  } else if (data.filters["explainToKid"]) {
    filter =
      data.filters["marks"] === 0 ? "explain to 5 years old" : `explain to 5 years old ${data.filters["marks"]} marks`;
  } else {
    filter = data.filters["marks"] > 0 ? `in ${data.filters["marks"]} marks` : "";
  }

  // requesting chat gpt response
  try {
    var completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "AI Tutor Instructions: Give clear, precise answers or solve.\n- assist students writing improvement and problem solving\n- Structure long answers\n- Avoid repetition.\n- be concise.\n if its math problem return compatible format for flutter_tex based on latex \n",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image if is maths problem solve it accurately, if not answer the question accurately? ${filter}`,
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      model: "gpt-4-turbo",
      stream: true,
      temperature: 0.2,
    });

    let arr_answer = [];
    for await (const chunk of completion) {
      let message = chunk.choices[0].delta.content;
      if (message) {
        arr_answer.push(message);
        socket.emit("answer-stream", `${message}`);
        try {
          // Your code here
          const tokenList = encoder.encode(message);
          completionTokens += tokenList.length;
        } catch (error) {
          console.error("An error occurred:", error);
        }
        console.log(message);
      }
    }

    socket.disconnect(console.log("socket disconnected"));

    const answer = arr_answer.join("");
    //console.log(answer);
    console.log(`Completion token usage: ${completionTokens}`);
    if (completionTokens > 0 && userId) { 
      const tokenDeduct = await SubscriberModel.findOneAndUpdate(
        { userId },
        { $inc: { 'subscription_info.token': -completionTokens } },
        { upsert: true }
      );
    }
    console.log(`deduction token usage ${tokenDeduct}`);
    encoder.free();
    const newUserData = {
      userId: data.userId,
      question: "Recent Scan",
      answers: answer,
    };
    await UsersGenData.create(newUserData);
    var count = await hitCounter("65bbae0ef201573df4ed646f");
    console.log(`Total Api Hit count: ${count}`);
    completion = null; // resetting socket data
  } catch (error) {
    console.log(error);
  }
};
