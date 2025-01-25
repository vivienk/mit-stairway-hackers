import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";

// ------------------------------------------------------------------------------------------
// Retrieve API keys from gitIgnored apiKeys.json to allow safe GIT pushing
// ------------------------------------------------------------------------------------------
// Resolve the path to the JSON file relative to the current file
const apiKeysPath = path.resolve(__dirname, '../src/apiKeys.json');

// Read the JSON file synchronously
const apiKeys = JSON.parse(fs.readFileSync(apiKeysPath, 'utf8'));

// Access the API keys
const stabilityAIKey: string = apiKeys.StabilityAI;
const openAIKey: string = apiKeys.OpenAI;

// Example usage
console.log('StabilityAI Key:', stabilityAIKey);
console.log('OpenAI Key:', openAIKey);
// ------------------------------------------------------------------------------------------

// Load system prompt from a .txt file
const systemPromptPath = path.resolve(__dirname, '../src/system-prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

// Function to sanitize file name
function sanitizeFileName(input: string): string {
    return input.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
}

// Function to generate an image from a prompt
async function generateImage(prompt: string): Promise<string> {
    const apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/core";

    // Combine system prompt and user prompt
    const fullPrompt = `${systemPrompt.trim()} ${prompt}`;

    // Set up the form data for the image generation request
    const formData = new FormData();
    formData.append("prompt", fullPrompt);
    formData.append("width", "512");
    formData.append("height", "512");
    formData.append("output_format", "png"); // Specify desired image format

    const startTime = Date.now();

    try {
        // Make the POST request to the Stability AI image generation API
        const response = await axios.post(apiUrl, formData, {
            headers: {
                Authorization: `Bearer ${stabilityAIKey}`,
                Accept: "image/*",
                ...formData.getHeaders(),
            },
            responseType: "arraybuffer", // Expect a binary image response
        });

        // Check if the response is successful
        if (response.status === 200) {
            const sanitizedFileName = `gen_${sanitizeFileName(prompt)}.png`;
            const imagePath = path.resolve(__dirname, sanitizedFileName);
            fs.writeFileSync(imagePath, Buffer.from(response.data));

            const elapsedTime = (Date.now() - startTime) / 1000;
            console.log(`Image generated successfully at: ${imagePath} (Elapsed Time: ${elapsedTime}s)`);

            return imagePath; // Return the path to the generated image
        } else {
            throw new Error(`Image generation failed: ${response.status} - ${response.data.toString()}`);
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}

// Function to generate a 3D model from an image
export async function generate3DModel(prompt: string): Promise<string> {
    const apiUrl = "https://api.stability.ai/v2beta/3d/stable-fast-3d";

    const startTime = Date.now();

    try {
        // Generate the image first
        const inputImageStartTime = Date.now();
        const inputImagePath = await generateImage(prompt);
        const inputImageElapsedTime = (Date.now() - inputImageStartTime) / 1000;

        // Ensure the image path is passed correctly
        console.log(`Using generated image: ${inputImagePath}`);

        // Set up the form data for the 3D model generation request
        const formData = new FormData();
        formData.append("image", fs.createReadStream(inputImagePath));
        formData.append("texture_resolution", "512");
        formData.append("foreground_ratio", "0.7");

        const modelStartTime = Date.now();

        // Make the POST request to the Stability AI 3D model generation API
        const response = await axios.post(apiUrl, formData, {
            headers: {
                Authorization: `Bearer ${stabilityAIKey}`,
                ...formData.getHeaders(),
            },
            responseType: "arraybuffer", // Expect a binary blob response
        });

        // Check if the response is successful
        if (response.status === 200) {
            const sanitizedFileName = `gen_${sanitizeFileName(prompt)}.glb`;
            const outputPath = path.resolve(__dirname, sanitizedFileName);
            fs.writeFileSync(outputPath, Buffer.from(response.data));

            const modelElapsedTime = (Date.now() - modelStartTime) / 1000;
            const totalElapsedTime = (Date.now() - startTime) / 1000;

            console.log(`3D model generated successfully at: ${outputPath}`);
            console.log(`Elapsed Time - Image Generation: ${inputImageElapsedTime}s, Model Generation: ${modelElapsedTime}s, Total: ${totalElapsedTime}s`);

            return outputPath; // Return the path to the generated model
        } else {
            throw new Error(`3D model generation failed: ${response.status} - ${response.data.toString()}`);
        }
    } catch (error) {
        console.error("Error generating 3D model:", error);
        throw error;
    }
}

// TESTING - Auto Generate Model
(async () => {
    try {
        const modelPath = await generate3DModel("a friendly squirrel with a yellow hat and red sunglasses. it smiles nicely and is very (!!!) cute.");
        console.log(`3D Model saved at: ${modelPath}`);
    } catch (error) {
        console.error("Failed to generate 3D model:", error);
    }
})();
