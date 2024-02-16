// import cors from "cors";
// import dotenv from "dotenv";
// import express from "express";
// import { createClient } from "@supabase/supabase-js";
// import OpenAI from "openai";
// import path from "path";
// import { fileURLToPath } from "url";

// dotenv.config();

// const app = express();
// const OPENAI_KEY = process.env.OPENAI_KEY;
// const openai = new OpenAI({ apiKey: OPENAI_KEY });

// // Supabase setup
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// app.use(express.json());
// app.use(express.static("public"));
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' ? [process.env.ORIGIN1, process.env.ORIGIN2, "https://tester-beige.vercel.app"] : ['http://localhost:3000', 'http://localhost:5173']
// }));

// app.post("/ask", async (req, res) => {
//   try {
//     const chatResponse = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [{ role: "system", content: "System message" }, { role: "user", content: req.body.question }],
//     });

//     const answer = chatResponse.choices[0].message.content;
//     const ttsResponse = await openai.audio.speech.create({ model: "tts-1", voice: "fable", input: answer });

//     const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
//     const audioFileName = `audio_${new Date().getTime()}.mp3`;

//     // Upload to Supabase
//     const { data, error } = await supabase
//       .storage
//       .from('voice')
//       .upload(`audio/${audioFileName}`, audioBuffer, {
//         contentType: 'audio/mp3',
//       });

//     if (error) {
//       throw error;
//     }

//     // Generate public URL
//     const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${data.Key}`;

//     res.json({ audioUrl: publicUrl, text: answer });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send(error.toString());
//   }
// });

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });






import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const app = express();
const OPENAI_KEY = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// Adjusting __dirname calculation for ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directory to store audio files, pointing to the Render disk mount path
const tempDirectory = "/mnt/render-storage";

app.use(express.json());
app.use(express.static("public"));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [process.env.ORIGIN1, process.env.ORIGIN2, "https://tester-beige.vercel.app"] : ['http://localhost:3000', 'http://localhost:5173']
}));



app.post("/ask", async (req, res) => {
  try {
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: "System message" }, { role: "user", content: req.body.question }],
    });

    const answer = chatResponse.choices[0].message.content;
    const ttsResponse = await openai.audio.speech.create({ model: "tts-1", voice: "fable", input: answer });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioFileName = `audio_${new Date().getTime()}.mp3`;
    const audioFilePath = path.join(tempDirectory, audioFileName);

    await fs.promises.writeFile(audioFilePath, audioBuffer);

    console.log(`Audio file written at: ${audioFilePath}`);
    const { data, error } = await supabase.storage
      .from('voice')
      .upload(`audio/${audioFileName}`, audioBuffer, {
        contentType: 'audio/mpeg', // Ensure this matches your audio file type
      });

    if (error) throw new Error(error.message);

  
    const audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/voice/audio/${audioFileName}`;
    res.json({ audioUrl, text: answer });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
});

app.get("/audio/:filename", (req, res) => {
  const filePath = path.join(tempDirectory, req.params.filename);
  res.sendFile(filePath, function (err) {
    if (err) {
      console.error(err);
      res.status(500).send("Error serving audio file.");
    }
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

