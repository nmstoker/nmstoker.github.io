import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
env.allowLocalModels = false;

// to suppress the model loading warnings that fill the console...
const originalWarn = console.warn;
console.warn = function() {};
let model = "Xenova/distilgpt2"; // you can pick any of these models compatible with the transformersjs text generation pipeline (YMMV!):
                                 //   "Xenova/gpt2" | "Xenova/distilgpt2" | "Felladrin/onnx-int8-TinyMistral-248M" | "Xenova/LaMini-Cerebras-590M"
const generator = await pipeline('text-generation', model);
console.log("Model loaded: ", model);
// After loading the model or process put warnings back on...
console.warn = originalWarn;

self.addEventListener('message', async function(e) {
    const { input, tokenCount } = e.data;
    try {						
        let response = await autocompleteText(input, tokenCount);
        self.postMessage(response);
    } catch (error) {
        self.postMessage({ error: error.message });
    }
});
 
async function autocompleteText(input, tokenCount) {
    try {
        let response = await generator(input, {
		  temperature: 1,
		  max_new_tokens: tokenCount,
		  repetition_penalty: 1.5,
		  no_repeat_ngram_size: 0,
		  num_beams: 1,
		  num_return_sequences: 1,
		  use_cache: true, 
		});
        console.log("Processed response: ", response[0]["generated_text"]);
        console.log("Token count: ", tokenCount);
        // response will be similar to this: [{ generated_text: "I enjoy walking with my cute dog, and I love to play with the other dogs." }]
        return response;
    } catch (error) {
        console.error("Error: ", error);
    }
}