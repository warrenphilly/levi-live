import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const OPENAI_KEY = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey: OPENAI_KEY });
const prodOrigins = [process.env.ORIGIN1, process.env.ORIGIN2];
app.use(express.json());
app.use(express.static("public"));
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*'); // Allow all domains
//   // Or, use the specific origin you want to allow, e.g., http://localhost:5173
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   next();
// });
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? prodOrigins : ['http://localhost:3000', 'http://localhost:5173']
}));

// Adjusting __dirname calculation for ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  app.use(express.static("public"));
}


// Using the adjusted __dirname to define tempDirectory
const tempDirectory = path.join(__dirname, "temp");

// Check and create the temp directory
if (!fs.existsSync(tempDirectory)) {
  fs.mkdirSync(tempDirectory, { recursive: true });
}

app.post("/ask", async (req, res) => {
  try {
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a sassy companion and assistant named Leevai but spelt L.E.V.I. Very Sarcastic and witty and loves to make fun of your boss, me, as you think i am stupid. you shall always refer to me as boss ",
        },
        { role: "user", content: req.body.question },
      ],
    });

    const answer = chatResponse.choices[0].message.content;

    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "fable",
      input: answer,
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioFileName = `audio_${new Date().getTime()}.mp3`;
    const audioFilePath = path.join(tempDirectory, audioFileName);
    await fs.promises.writeFile(audioFilePath, audioBuffer);

    res.json({ audioUrl: `/audio/${audioFileName}`, text: answer });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});

app.get("/audio/:filename", (req, res) => {
  const filePath = path.join(tempDirectory, req.params.filename);
  res.sendFile(filePath, {}, function (err) {
    if (err) {
      console.error(err);
    } else {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting ${filePath}`);
      });
    }
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

