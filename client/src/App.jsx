import React, { useEffect, useRef, useState } from "react";
import "./App.css"; // Ensure Tailwind CSS is imported here

function App() {
  const [typing, setTyping] = useState(false);
  const silenceTimer = useRef(null);
  const [silenceThreshold] = useState(200);
  const [conversation, setConversation] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [buttonText, setButtonText] = useState("Start Recording");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState("start"); // 'start', 'stop', 'listening'
  const [recognition, setRecognition] = useState(null);
  
  const conversationEndRef = useRef(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]); // Dependency array ensures effect runs every time conversation changes


  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const speechRecognition = new window.webkitSpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;

      speechRecognition.onresult = (event) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript;
        setQuestion(transcript);

        // Reset silence detection timer on new speech detected
        console.log(silenceTimer.current);
        clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
          console.log("Silence detected. Stopping recording.");

          speechRecognition.stop();
          sendQuestion(transcript);
          setButtonText("Thinking...");
          setButtonDisabled(true); // This triggers onend
        }, silenceThreshold);
      };

      speechRecognition.onend = () => {
        // Automatically submit the question when recording stops
        if (question) {
          sendQuestion(question);
          setQuestion("Thinking..."); // Set input field to "Thinking..."
          setButtonText("Thinking");
          setRecordingState("listening");
          setButtonDisabled(true); // Disable button
          // Update state to indicate waiting for playback
        }
      };

      setRecognition(speechRecognition);
    } else {
      alert("Your browser does not support speech recognition.");
    }

    // Cleanup function to clear the silence detection timer
    return () => clearTimeout(silenceTimer.current);
  }, [question, silenceThreshold]);

  useEffect(() => {
    // Cleanup thinking animation on component unmount
    return () => clearInterval(thinkingInterval.current);
  }, []);

  const thinkingInterval = React.useRef(null);

  const simulateTyping = (text) => {
    if (typeof text !== "string" || text.length === 0) {
      console.error("simulateTyping called with invalid text:", text);
      // Optionally, handle this case, e.g., display a default message
      return;
    }

    let typedText = "";
const typingSpeed = 40; // milliseconds
for (let i = 0; i < text.length; i++) {
  setTimeout(() => {
    typedText += text[i];
    // Ensure we're updating the conversation with the current typedText
    setConversation((conversation) => [
      ...conversation.slice(0, -1),
      { sender: "server", text: typedText },
    ]);
    if (i === text.length - 1) {
      // Update any state as needed after typing is complete
    }
  }, i * typingSpeed);
}
  };

  const showThinkingAnimation = () => {
    let dots = "";
    const maxDots = 3;
    clearInterval(thinkingInterval.current); // Clear any existing interval to restart the animation
    setConversation((conversation) => [
      ...conversation,
      { sender: "server", text: "Thinking" },
    ]);
    thinkingInterval.current = setInterval(() => {
      if (dots.length < maxDots) {
        dots += ".";
      } else {
        dots = "";
      }
      // Update the last message to reflect the current number of dots
      setConversation((conversation) => {
        let newConversation = [...conversation];
        newConversation[newConversation.length - 1] = {
          sender: "server",
          text: `Thinking${dots}`,
        };
        return newConversation;
      });
    }, 500); // Update every 500ms
  };

  const startRecording = () => {
    if (buttonText === "Start Recording") {
      recognition.start();
      setButtonText("Stop Recording");
      setButtonDisabled(false);
      setIsRecording(true);
      setRecordingState("stop");
    } else {
      recognition.stop(); // This will trigger onend event
    } // Button should show 'Stop Recording' and be red
  };

  const stopRecording = () => {
    recognition.stop();
    setIsRecording(false);
    setButtonText("Thinking...");
    setButtonDisabled(true);
    sendQuestion(question); // Submit the question when stopping the recording
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendQuestion = async (question) => {
    setConversation([...conversation, { sender: "user", text: question }]);
    console.log("Question:", question);
    setButtonDisabled(true);
    showThinkingAnimation(); // Log the question
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      console.log("Audio URL:", data.audioUrl);
      console.log("Response:", data); // Log the response
      clearInterval(thinkingInterval.current);
      // Assuming `data.text` contains the response text from the server
      if (data.text) {
        simulateTyping(data.text);
      } else {
        console.error("No text in response:", data);
        simulateTyping("Received an unexpected response from the server.");
      }
       // Log the audio URL (if available
      if (data.audioUrl) {
        const audioElement = document.getElementById("responseAudio");
        audioElement.src = `${import.meta.env.VITE_API_URL}${data.audioUrl}`;
        

        audioElement.play();
        setAnswer("Playing audio response..."); // Placeholder text for audio response
      } else {
        console.log("No audio URL received");
        setAnswer("No audio response received.");
      }
      setConversation([...conversation, { sender: "user", text: question }, { sender: "system", text: data.text }]);
    
    } catch (error) {
      console.error("Error sending question:", error);
      setAnswer("Failed to get a response.");
    }

    // Simulate a delay to fetch the response

    // Reset states after sending the question or handling an error
    
    setQuestion(""); // Clear the question field
    setButtonText("Start Recording"); // Reset button text
    setButtonDisabled(false); // Enable the button
    setIsRecording(false); // Ensure recording state is reset
    setRecordingState("start"); // Indicate ready to start a new recording
  };
  // Determine button classes based on recording state

const buttonClasses = `font-bold ml-[10px] flex items-center justify-center px-4 py-2 rounded ${
  buttonText === "Start Recording"
    ? "bg-blue-500 hover:bg-blue-700"
    : buttonText === "Stop Recording"
    ? "bg-red-500 hover:bg-red-700"
    : "bg-gray-500"
}`;

return (
  <div className="App bg-gray-800 min-h-screen flex flex-col items-center justify-center text-white">
    {/* Div for Levi&apos;s Introduction */}
<div className="w-full px-4 py-8 max-w-4xl text-center sm:p-8">
  <h1 className="text-3xl sm:text-5xl">
    Hey, I&apos;m <span className="text-blue-500">L.E.V.I.</span>
  </h1>
  <h2 className="text-xl mt-4 mb-6 sm:text-2xl sm:mt-5 sm:mb-8">Your only friend...</h2>
  <p className="text-sm sm:text-md mt-2 max-w-2xl mx-auto">
    Here&apos;s the deal: I&apos;m an AI assistant, crafted with a dash of sarcasm and a pinch of wit, at your service to enlighten, assist, or simply entertain. Whether you&apos;re here to learn, study, or just chat, I&apos;ve got you covered. Just try not to fall too hard for my charm. If you&apos;re actually in the mood to learn something for once...check out my{" "}
    <a href="https://www.github.com/warrenphilly" className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">GitHub</a> and remember to SPEAK CLEARLY and LOUDLY. I&apos;m a bit hard of hearing :).
  </p>
</div>

    <div className="overflow-y-auto bg-gray-700 min-h-[200px] rounded-xl shadow-inner w-full max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
      {conversation.map((message, index) => (
        <div key={index} className={`message ${message.sender === "user" ? "text-right" : "text-left"}`}>
          <p className={`inline-block rounded-lg mb-4 shadow-2xl ${message.sender === "user" ? "bg-blue-500 ml-20 p-4" : "bg-gray-600 mr-5 p-4"}`}>
            {message.text}
          </p>
        </div>
      ))}
      <div ref={conversationEndRef} />
    </div>

    {/* Input and Button */}
    <div className="mt-4 w-full px-4 flex flex-col sm:flex-row justify-center items-center sm:mb-4">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question"
        className="p-4 w-full max-w-md mb-4 sm:mb-0 sm:mr-4 bg-[#535355] text-white py-2 rounded-lg"
      />
      <button
        onClick={stopRecording}
        className="bg-blue-300 hover:bg-blue-700 font-bold flex items-center justify-center h-[40px] px-4 rounded disabled:opacity-50 w-full sm:w-auto mb-4 sm:mb-0 sm:ml-2"
        disabled={buttonDisabled}
      >
        Send
      </button>
      <button
        onClick={toggleRecording}
        className={`${buttonClasses} w-full sm:w-auto sm:ml-2`}
        disabled={buttonDisabled}
      >
        {buttonText}
      </button>
    </div>
    <audio id="responseAudio" hidden></audio>
  </div>
);


}

export default App;

